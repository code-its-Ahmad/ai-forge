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
    const { imageUrl, niche = 'general', clientAnalysis } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    console.log('Scoring thumbnail with Gemini 3 Pro for niche:', niche);

    // Include client-side TensorFlow analysis if provided
    const clientDataSection = clientAnalysis ? `
Client-Side Neural Network Analysis (TensorFlow.js):
- Faces Detected: ${clientAnalysis.faces?.length || 0}
- Dominant Colors: ${clientAnalysis.dominantColors?.join(', ') || 'N/A'}
- Brightness: ${clientAnalysis.brightness}%
- Contrast: ${clientAnalysis.contrast}%
- Resolution: ${clientAnalysis.resolution?.width}x${clientAnalysis.resolution?.height}
- Preliminary Quality Score: ${clientAnalysis.qualityScore}/100

Use this data to enhance your analysis.
` : '';

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-preview', // Latest Gemini 3 Pro
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an elite YouTube thumbnail expert and CTR optimization specialist. Analyze this thumbnail for the "${niche}" niche with extreme precision.

${clientDataSection}

SCORING CRITERIA (Be strict and precise):

1. **Visual Impact** (25 points max)
   - First-glance attention grab (0-10)
   - Color psychology effectiveness (0-8)
   - Contrast and visual hierarchy (0-7)
   
2. **Emotional Appeal** (25 points max)
   - Curiosity/intrigue generation (0-10)
   - Emotional trigger strength (0-8)
   - Facial expression effectiveness if present (0-7)

3. **Clarity & Readability** (25 points max)
   - Focal point clarity (0-10)
   - Text readability at small sizes (0-8)
   - Clutter-free composition (0-7)

4. **Brand & Niche Fit** (15 points max)
   - Niche-appropriate styling (0-8)
   - Professional quality (0-7)

5. **Platform Optimization** (10 points max)
   - Mobile-friendly (0-5)
   - Aspect ratio correctness (0-5)

CTR PREDICTION based on:
- Industry benchmarks for ${niche}
- Visual engagement factors
- Competitive analysis signals

Return ONLY this JSON structure (no markdown, no explanation):
{
  "totalScore": number,
  "grade": "S"|"A"|"B"|"C"|"D"|"F",
  "ctrPrediction": { "low": number, "expected": number, "high": number },
  "categories": {
    "visualImpact": { "score": number, "maxScore": 25, "feedback": string },
    "emotionalAppeal": { "score": number, "maxScore": 25, "feedback": string },
    "clarityReadability": { "score": number, "maxScore": 25, "feedback": string },
    "brandConsistency": { "score": number, "maxScore": 15, "feedback": string },
    "platformOptimization": { "score": number, "maxScore": 10, "feedback": string }
  },
  "strengths": string[],
  "weaknesses": string[],
  "actionableImprovements": [
    { "priority": "high"|"medium"|"low", "suggestion": string, "expectedImpact": string }
  ],
  "competitorComparison": string,
  "nicheSpecificTips": string[]
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
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Usage limit reached. Please add credits.' }), {
          status: 402,
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
      console.error('Failed to parse response:', content);
      throw new Error('Failed to parse AI response');
    }

    return new Response(JSON.stringify({
      success: true,
      ...scoreData,
      model: 'gemini-3-pro-preview',
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
