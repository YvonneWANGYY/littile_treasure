import { GoogleGenAI } from "@google/genai";
import { Transaction, Account, Currency, EXCHANGE_RATES, TransactionStatus, TransactionType, AccountType, InvestmentHolding } from "../types";
import { Language } from "../translations";

const getAiClient = () => {
    //const apiKey = process.env.API_KEY;
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    if (!apiKey) throw new Error("API Key missing");
    return new GoogleGenAI({ apiKey });
};

export const getFinancialAdvice = async (
  transactions: Transaction[],
  accounts: Account[],
  baseCurrency: Currency,
  language: Language
): Promise<string> => {
  try {
    const ai = getAiClient();

    // Prepare data summary
    const totalAssets = accounts
      .filter(a => a.type !== AccountType.CREDIT && a.type !== AccountType.LOAN)
      .reduce((sum, a) => sum + (a.balance * EXCHANGE_RATES[a.currency] / EXCHANGE_RATES[baseCurrency]), 0);
    
    const investmentAssets = accounts
      .filter(a => a.type === AccountType.INVESTMENT)
      .reduce((sum, a) => sum + (a.balance * EXCHANGE_RATES[a.currency] / EXCHANGE_RATES[baseCurrency]), 0);

    const totalLiabilities = accounts
      .filter(a => a.type === AccountType.CREDIT || a.type === AccountType.LOAN)
      .reduce((sum, a) => sum + (Math.abs(a.balance) * EXCHANGE_RATES[a.currency] / EXCHANGE_RATES[baseCurrency]), 0);

    const pendingIncome = transactions
      .filter(t => t.type === TransactionType.INCOME && t.status === TransactionStatus.PENDING)
      .reduce((acc, t) => acc + (t.amount * (EXCHANGE_RATES[baseCurrency] / EXCHANGE_RATES[t.currency])), 0);

    const recentTransactions = transactions.slice(0, 50).map(t => ({
      date: t.date.split('T')[0],
      type: t.type,
      category: t.category,
      amount: `${t.amount} ${t.currency}`,
      tags: t.tags,
      status: t.status,
    }));

    const prompt = `
      You are a professional financial advisor called "Little Treasury Advisor".
      Base Currency: ${baseCurrency}. Language: ${language === 'zh' ? 'Chinese' : 'English'}.

      Financial Snapshot:
      - Total Liquid Assets: ${totalAssets.toFixed(2)}
      - Investment Assets: ${investmentAssets.toFixed(2)}
      - Pending Income: ${pendingIncome.toFixed(2)}
      - Liabilities: ${totalLiabilities.toFixed(2)}
      
      Recent 50 Transactions JSON:
      ${JSON.stringify(recentTransactions)}

      Provide advice:
      1. Investment: Comment on global trends relevant to the portfolio size.
      2. Spending: Analyze habits.
      3. Pending Income: How to manage cash flow.
      4. Debt: Repayment strategies.
      
      Format in Markdown. Concise.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "No advice generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Service unavailable.";
  }
};

/**
 * Handles the Investment Chat logic.
 * Inputs: Current Holdings, User Message (Text), User Image (Base64)
 * Outputs: Updated Holdings (JSON) AND Advice (Text)
 */
export const processInvestmentChat = async (
    currentHoldings: InvestmentHolding[],
    userMessage: string,
    imageBase64: string | null,
    baseCurrency: Currency,
    language: Language
): Promise<{ text: string; updatedHoldings: InvestmentHolding[] | null }> => {
    try {
        const ai = getAiClient();

        const prompt = `
            You are an intelligent portfolio manager assistant.
            
            Current Portfolio (JSON):
            ${JSON.stringify(currentHoldings)}

            User Input: "${userMessage}"
            
            Task:
            1. Analyze the user's input (and image if provided). The user might upload a screenshot of a financial app (like Alipay, Robinhood) or type "I bought 10 shares of Apple for $150".
            2. Update the 'Current Portfolio' list based on this info. 
               - If it's a screenshot showing current values, update the 'amount' and 'dailyChange'.
               - If it's a new buy, add it. 
               - If selling, remove or decrease.
               - If no specific numbers are given (e.g., just "How is the market?"), keep the portfolio as is.
            3. Provide a brief financial commentary based on the products and current global financial news.

            Output Format:
            You must return a JSON object with this EXACT structure (no markdown code blocks around it if possible, or extractable):
            {
                "response": "Your friendly advice/commentary here...",
                "holdings": [ ... updated array of objects with name, amount, dailyChange ...]
            }
        `;

        const parts: any[] = [{ text: prompt }];
        
        if (imageBase64) {
            // Remove header if present (e.g., data:image/png;base64,)
            const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
            parts.push({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: cleanBase64
                }
            });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts },
            config: { responseMimeType: 'application/json' }
        });

        const jsonStr = response.text.trim();
        // Clean potential markdown wrappers
        const cleanJson = jsonStr.replace(/^```json/, '').replace(/```$/, '');
        const data = JSON.parse(cleanJson);

        return {
            text: data.response,
            updatedHoldings: data.holdings
        };

    } catch (error) {
        console.error("Investment Chat Error:", error);
        return { text: "Error processing investment data. Please try again.", updatedHoldings: null };
    }
}
