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
    const { topic, platform = 'YouTube', tone = 'engaging', count = 5 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!topic) {
      throw new Error('Topic is required');
    }

    console.log('Generating titles for:', { topic, platform, tone, count });

    const prompt = `You are an expert content strategist specializing in creating viral, click-worthy titles for ${platform}.

Generate ${count} highly engaging titles for a video about: "${topic}"

Platform: ${platform}
Tone: ${tone}

Best Practices to Follow:
1. Use power words that evoke emotion (Amazing, Shocking, Ultimate, Secret, Proven)
2. Include numbers when relevant (Top 5, 3 Ways, 10 Secrets)
3. Create curiosity gaps without being clickbait
4. Keep titles concise (50-60 characters for YouTube)
5. Use brackets or parentheses for context [2024], (MUST WATCH)
6. Address the viewer directly (You, Your)
7. Promise value or transformation
8. Create urgency when appropriate

Return ONLY a JSON array of title objects with this structure:
[
  {
    "title": "The actual title text",
    "reason": "Brief explanation of why this title works",
    "estimatedCTR": "high/medium/low"
  }
]

Generate titles that balance curiosity, clarity, and credibility.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
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
      throw new Error('No content generated');
    }

    // Parse the JSON response
    let titles;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        titles = JSON.parse(jsonMatch[0]);
      } else {
        titles = JSON.parse(content);
      }
    } catch {
      console.error('Failed to parse JSON, returning raw content');
      titles = [{ title: content, reason: 'AI generated', estimatedCTR: 'medium' }];
    }

    return new Response(JSON.stringify({
      success: true,
      titles,
      topic,
      platform,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-titles:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to generate titles' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
