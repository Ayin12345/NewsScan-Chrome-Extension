export async function fetchOpenAI(content: string, apiKey: string) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content }]
      })
    })
    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message.content) {
      return data.choices[0].message.content;
    } else {
      throw new Error(data.error?.message || 'No response from OpenAI');
    }
  }

export async function fetchGemini(content: string, apiKey: string) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: content
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        return data.candidates[0].content.parts[0].text;
    } else {
        throw new Error(data.error?.message || 'No response from Gemini');
    }
}

export async function fetchLlama(content: string, apiKey: string) {
    console.log('Llama API Key:', apiKey ? 'Present' : 'Missing');
    console.log('API Key length:', apiKey.length);
    
    try {
        const response = await fetch('https://api-inference.huggingface.co/models/meta-llama/Llama-3.3-70B-Instruct', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: content,
                parameters: {
                    max_new_tokens: 500,
                    temperature: 0.7,
                    return_full_text: false
                }
            })
        });

        console.log('Llama Response Status:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Llama API Full Error:', {
                status: response.status,
                statusText: response.statusText,
                errorText: errorText,
                headers: Object.fromEntries(response.headers.entries())
            });
            throw new Error(`Llama API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Llama API Response Data:', data);

        if (Array.isArray(data) && data[0]?.generated_text) {
            return data[0].generated_text;
        }

        console.error('Llama API Invalid Response Format:', data);
        throw new Error(data.error || 'No valid response from Llama');
    } catch (error) {
        console.error('Llama API Call Failed:', error);
        throw error;
    }
}

//add gemini in later, need to be 18+ 
export async function fetchCohere(content: string, apiKey: string) {
    const response = await fetch('https://api.cohere.ai/v1/generate', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            model: 'command',
            prompt: content,
            max_tokens: 1250,
         })
    });
    
    if (!response.ok) {
        throw new Error(`Cohere API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data.generations && data.generations[0] && data.generations[0].text) {
        return data.generations[0].text;
    } else {
        throw new Error(data.message || 'No response from Cohere');
    }
}

export async function fetchMistral7B(content: string, apiKey: string) {
    try {
        const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: content,
                parameters: {
                    max_new_tokens: 500,
                    temperature: 0.7,
                    return_full_text: false
                }
            })
        });

        console.log('Mistral Response Status:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Mistral API Full Error:', {
                status: response.status,
                statusText: response.statusText,
                errorText: errorText,
                headers: Object.fromEntries(response.headers.entries())
            });
            throw new Error(`Mistral API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Mistral API Response Data:', data);

        if (Array.isArray(data) && data[0]?.generated_text) {
            return data[0].generated_text;
        }

        console.error('Mistral API Invalid Response Format:', data);
        throw new Error(data.error || 'No valid response from Mistral 7B');
    } catch (error) {
        console.error('Mistral API Call Failed:', error);
        throw error;
    }
}

export async function fetchMixtral8x7B(content: string, apiKey: string) {
    try {
        const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                inputs: content,
                parameters: {
                    max_new_tokens: 500,
                    temperature: 0.7,
                    return_full_text: false
                }
            })
        });

        console.log('Mixtral Response Status:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Mixtral API Full Error:', {
                status: response.status,
                statusText: response.statusText,
                errorText: errorText,
                headers: Object.fromEntries(response.headers.entries())
            });
            throw new Error(`Mixtral API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Mixtral API Response Data:', data);

        if (Array.isArray(data) && data[0] && data[0].generated_text) {
            return data[0].generated_text;    
        }

        console.error('Mixtral API Invalid Response Format:', data);
        throw new Error(data.error || 'No response from Mixtral 8x7B');
    } catch (error) {
        console.error('Mixtral API Call Failed:', error);
        throw error;
    }
}
