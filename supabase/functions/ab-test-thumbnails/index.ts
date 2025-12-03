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
    const { thumbnailA, thumbnailB, videoTitle = '' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!thumbnailA || !thumbnailB) {
      throw new Error('Both thumbnails are required for A/B testing');
    }

    console.log('A/B testing thumbnails');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-preview', // Latest Gemini 3 Pro for advanced analysis
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an elite YouTube A/B testing specialist with deep expertise in thumbnail optimization and CTR prediction. Compare these two thumbnails${videoTitle ? ` for the video "${videoTitle}"` : ''} with precision.

EVALUATION CRITERIA:
1. Visual Impact (instant attention grab)
2. Emotional Appeal (curiosity, excitement, urgency)
3. Clarity (focal points, message clarity)
4. Clickability (thumb-stopping power)
5. Professionalism (production quality)
6. Mobile Optimization (small screen readability)
7. Color Psychology (strategic color usage)

Provide a comprehensive analysis with statistical confidence levels.

Return ONLY this JSON (no markdown):
{
  "winner": "A"|"B",
  "confidence": number,
  "winnerExplanation": string,
  "statisticalConfidence": "low"|"medium"|"high"|"very high",
  "comparison": {
    "visualImpact": { "A": number, "B": number, "winner": "A"|"B", "margin": number },
    "emotionalAppeal": { "A": number, "B": number, "winner": "A"|"B", "margin": number },
    "clarity": { "A": number, "B": number, "winner": "A"|"B", "margin": number },
    "clickability": { "A": number, "B": number, "winner": "A"|"B", "margin": number },
    "professionalism": { "A": number, "B": number, "winner": "A"|"B", "margin": number },
    "mobileOptimization": { "A": number, "B": number, "winner": "A"|"B", "margin": number },
    "colorPsychology": { "A": number, "B": number, "winner": "A"|"B", "margin": number }
  },
  "thumbnailA": {
    "score": number,
    "grade": "S"|"A"|"B"|"C"|"D"|"F",
    "strengths": string[],
    "weaknesses": string[],
    "uniqueElements": string[]
  },
  "thumbnailB": {
    "score": number,
    "grade": "S"|"A"|"B"|"C"|"D"|"F",
    "strengths": string[],
    "weaknesses": string[],
    "uniqueElements": string[]
  },
  "ctrPrediction": {
    "A": { "min": number, "expected": number, "max": number },
    "B": { "min": number, "expected": number, "max": number }
  },
  "recommendation": string,
  "improvementSuggestions": {
    "forLoser": string[],
    "forWinner": string[]
  },
  "combinedBestPractices": string[]
}`
              },
              {
                type: 'text',
                text: 'Thumbnail A:'
              },
              {
                type: 'image_url',
                image_url: { url: thumbnailA }
              },
              {
                type: 'text',
                text: 'Thumbnail B:'
              },
              {
                type: 'image_url',
                image_url: { url: thumbnailB }
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
      throw new Error('No comparison generated');
    }

    let testResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        testResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid response format');
      }
    } catch {
      throw new Error('Failed to parse AI response');
    }

    return new Response(JSON.stringify({
      success: true,
      ...testResult,
      testedAt: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ab-test-thumbnails:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to A/B test thumbnails' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
