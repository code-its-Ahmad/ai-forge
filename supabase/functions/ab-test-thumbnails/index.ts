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
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a YouTube A/B testing expert. Compare these two thumbnails${videoTitle ? ` for the video "${videoTitle}"` : ''} and determine which one would perform better.

Analyze both thumbnails and provide:
1. Winner selection with confidence percentage
2. Detailed comparison across key metrics
3. Specific reasons why the winner is better
4. How to improve the losing thumbnail

Return ONLY this JSON:
{
  "winner": "A"|"B",
  "confidence": number,
  "winnerExplanation": string,
  "comparison": {
    "visualImpact": { "A": number, "B": number, "winner": "A"|"B" },
    "emotionalAppeal": { "A": number, "B": number, "winner": "A"|"B" },
    "clarity": { "A": number, "B": number, "winner": "A"|"B" },
    "clickability": { "A": number, "B": number, "winner": "A"|"B" },
    "professionalism": { "A": number, "B": number, "winner": "A"|"B" }
  },
  "thumbnailA": {
    "score": number,
    "strengths": string[],
    "weaknesses": string[]
  },
  "thumbnailB": {
    "score": number,
    "strengths": string[],
    "weaknesses": string[]
  },
  "ctrPrediction": {
    "A": { "min": number, "max": number },
    "B": { "min": number, "max": number }
  },
  "recommendation": string,
  "improvementSuggestions": {
    "forLoser": string[],
    "forWinner": string[]
  }
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
