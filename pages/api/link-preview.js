import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const response = await fetch(`https://api.linkpreview.net/?key=YOUR_API_KEY&q=${url}`);
    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error });
    }

    res.status(200).json({
      title: data.title,
      description: data.description,
      image: data.image,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch link preview' });
  }
}