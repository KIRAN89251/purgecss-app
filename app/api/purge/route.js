// app/api/purge/route.js

import { NextResponse } from 'next/server';
import { PurgeCSS } from 'purgecss';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom'; // HTML parsing

export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to fetch CSS content
const fetchCSSFile = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch CSS: ${url}`);
    return await response.text();
  } catch (error) {
    console.error(`Error fetching CSS from ${url}:`, error);
    return ''; // Return empty string on error
  }
};

// Helper to clean filenames by removing query params
const cleanFileName = (url) => {
  const parsedUrl = new URL(url);
  const baseName = path.basename(parsedUrl.pathname) || 'style.css'; // Default to 'style.css' if no name
  return baseName.replace(/\?.*$/, ''); // Strip query parameters
};

const handlePurgeCSS = async (htmlContent, cssContent) => {
  const purgeCSSResults = await new PurgeCSS().purge({
    content: [{ raw: htmlContent, extension: 'html' }],
    css: [{ raw: cssContent }],
  });

  return purgeCSSResults[0].css;
};

export async function POST(req) {
  const data = await req.formData();
  const url = data.get('url');

  // Check and create public directory if it doesn't exist
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
    console.log('Created public directory.');
  }

  // Fetch the HTML content from the provided URL
  let htmlContent = '';
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch HTML.');
    htmlContent = await response.text();
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching HTML.' }, { status: 400 });
  }

  // Parse the HTML to find all CSS links
  const dom = new JSDOM(htmlContent);
  const links = Array.from(dom.window.document.querySelectorAll('link[rel="stylesheet"]'));

  if (links.length === 0) {
    return NextResponse.json({ message: 'No CSS files found.' }, { status: 400 });
  }

  const purgedFiles = [];

  // Process each CSS file separately
  for (const link of links) {
    const href = link.href.startsWith('http') ? link.href : new URL(link.href, url).href;

    const cssContent = await fetchCSSFile(href);

    if (cssContent) {
      try {
        const purgedCSS = await handlePurgeCSS(htmlContent, cssContent);
        const fileName = `purged-${cleanFileName(href)}`;
        const outputPath = path.join(publicDir, fileName); // Use publicDir

        fs.writeFileSync(outputPath, purgedCSS);
        purgedFiles.push({ name: fileName, url: `/${fileName}` });
      } catch (error) {
        console.error(`Error purging CSS from ${href}:`, error);
      }
    }
  }

  return NextResponse.json({
    message: 'CSS files processed successfully.',
    files: purgedFiles,
  });
}