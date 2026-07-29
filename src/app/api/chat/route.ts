import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getNormalizedData } from '@/utils/dataProcessing';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Mock response for demo purposes so the UI can be tested without an API key
      const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
      
      let mockResponse = "[Mock Mode - No API Key Found]\n\nBased on the data context, **email triage** is a major time sink:\n- It accounts for over **70% of the repetitive volume** across several departments.\n- **Employee 012** (Data Analyst) logs the highest repetitive duration for this task.\n- **Employee 004** (Finance Manager) also logs significant repetitive hours doing email triage.\n- It is the **#1 priority** for automation to recover maximum INR.";

      if (lastMessage.includes('client communication') || lastMessage.includes('client')) {
        mockResponse = "[Mock Mode - No API Key Found]\n\nHere is what the data says about **client communication**:\n- It is the **second highest time-sink** across the organization.\n- However, only **25%** of client communication time is marked as highly repetitive.\n- **Employee 002** (Sales Rep) logs the most hours in this category.\n- Automation potential is lower here compared to email triage, as it involves nuanced human interaction.";
      } else if (lastMessage.includes('data entry')) {
        mockResponse = "[Mock Mode - No API Key Found]\n\nRegarding **data entry**:\n- This task is **100% repetitive** and highly concentrated in the Operations department.\n- **Employee 003** (Operations Analyst) handles the vast majority of this workload.\n- Automating this task would directly save approximately **45 hours per month**.";
      }
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return NextResponse.json({ message: { role: 'assistant', content: mockResponse } });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Get Data for grounding
    const data = getNormalizedData();
    // Stringify a minimal version to save tokens
    const contextData = {
      employees: Object.values(data.employees).map(e => ({
        id: e.employeeId, name: e.name, dept: e.department, role: e.role, monthlyRateINR: e.monthlySalaryINR
      })),
      activities: data.activities.map(a => ({
        emp: a.employeeId, dept: a.department, date: a.timestamp.toISOString().split('T')[0], app: a.appUsed, task: a.taskCategory, mins: a.durationMinutes, rep: a.isRepetitive
      }))
    };

    const systemPrompt = `You are a COO's analytical assistant for the 'Workforce Pulse' dashboard.
You have access to the normalized employee activity logs and HRMS data.
Answer questions based ONLY on this data. Cite specific numbers and rows.
Assume 70% of repetitive task time is recoverable through automation.
CRITICAL: Always answer in a concise, point-by-point format using bullet lists (-). Avoid writing long paragraphs.
Data Context:
${JSON.stringify(contextData)}
`;

    // Convert messages array to a string for simple QA
    const userPrompt = messages.map((m: any) => `${m.role}: ${m.content}`).join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt
      }
    });

    return NextResponse.json({ message: { role: 'assistant', content: response.text } });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
}
