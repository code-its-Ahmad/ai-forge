import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, niche = 'general' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    console.log('Scoring thumbnail for niche:', niche);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a YouTube thumbnail expert. Analyze this thumbnail for the "${niche}" niche and provide a comprehensive scoring.

Score each category from 1-100 and provide specific feedback:

1. **Visual Impact** (25 points max)
   - Does it grab attention in <1 second?
   - Bold colors, high contrast?
   
2. **Emotional Appeal** (25 points max)
   - Does it evoke curiosity, excitement, or urgency?
   - Facial expressions compelling?

3. **Clarity & Readability** (25 points max)
   - Clear focal point?
   - Text readable at small sizes?
   - Not too cluttered?

4. **Brand Consistency** (15 points max)
   - Professional look?
   - Consistent style elements?

5. **Platform Optimization** (10 points max)
   - Correct aspect ratio (16:9)?
   - Works on mobile?

Return ONLY this JSON structure:
{
  "totalScore": number,
  "grade": "S"|"A"|"B"|"C"|"D"|"F",
  "ctrPrediction": { "low": number, "expected": number, "high": number },
  "categories": {
    "visualImpact": { "score": number, "feedback": string },
    "emotionalAppeal": { "score": number, "feedback": string },
    "clarityReadability": { "score": number, "feedback": string },
    "brandConsistency": { "score": number, "feedback": string },
    "platformOptimization": { "score": number, "feedback": string }
  },
  "strengths": string[],
  "weaknesses": string[],
  "actionableImprovements": [
    { "priority": "high"|"medium"|"low", "suggestion": string, "expectedImpact": string }
  ],
  "competitorComparison": string
}`
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No analysis generated');
    }

    let scoreData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scoreData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid response format');
      }
    } catch {
      throw new Error('Failed to parse AI response');
    }

    return new Response(JSON.stringify({
      success: true,
      ...scoreData,
      analyzedAt: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in score-thumbnail:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to score thumbnail' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
