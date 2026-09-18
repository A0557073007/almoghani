export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "اكتب رسالة أولاً" });
    }

    if (message.length > 4000) {
      return res.status(400).json({ error: "الرسالة طويلة جداً" });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `******
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        input: message,
        max_output_tokens: 1000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "حدث خطأ في خدمة الذكاء الاصطناعي"
      });
    }

    const reply =
      data.output
        ?.flatMap(item => item.content || [])
        ?.find(item => item.type === "output_text")
        ?.text || "لم أتمكن من إنشاء رد.";

    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({
      error: "حدث خطأ في ALMOGHANI AI"
    });
  }
}
