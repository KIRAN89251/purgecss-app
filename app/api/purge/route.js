import { NextResponse } from 'next/server';
import { PurgeCSS } from 'purgecss';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

// Helper to fetch CSS content
const fetchCSSFile = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch CSS: ${url}`);
    return await response.text();
  } catch (error) {
    console.error(`Error fetching CSS from ${url}:`, error);
    return '';
  }
};

// PurgeCSS logic for individual sections
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

  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
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

  // Parse the HTML and extract the <main> element
  const dom = new JSDOM(htmlContent);
  const mainElement = dom.window.document.querySelector('main');
  if (!mainElement) {
    return NextResponse.json({ message: '<main> element not found.' }, { status: 400 });
  }

  // Find all CSS links in the document
  const links = Array.from(dom.window.document.querySelectorAll('link[rel="stylesheet"]'));
  if (links.length === 0) {
    return NextResponse.json({ message: 'No CSS files found.' }, { status: 400 });
  }

  const purgedFiles = [];
  const cssContents = [];

  // Fetch all CSS content once
  for (const link of links) {
    const href = link.href.startsWith('http') ? link.href : new URL(link.href, url).href;
    const cssContent = await fetchCSSFile(href);
    if (cssContent) cssContents.push(cssContent);
  }

  // Process each section
  const sections = Array.from(mainElement.children).filter((el) => el.id);

  for (const section of sections) {
    const sectionHTML = section.outerHTML;
    let mergedCSS = '';

    // Purge and merge CSS for this section
    for (const cssContent of cssContents) {
      try {
        const purgedCSS = await handlePurgeCSS(sectionHTML, cssContent);
        mergedCSS += purgedCSS;
      } catch (error) {
        console.error(`Error purging CSS for section ${section.id}:`, error);
      }
    }

    // Save merged CSS for this section
    if (mergedCSS) {
      const fileName = `section-${section.id}.css`;
      const outputPath = path.join(publicDir, fileName);

      fs.writeFileSync(outputPath, mergedCSS);
      purgedFiles.push({ id: section.id, name: fileName, url: `/${fileName}` });
    }
  }

  return NextResponse.json({
    message: 'CSS files processed and merged successfully for each section.',
    files: purgedFiles,
  });
}
