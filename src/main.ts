import * as marked from 'marked';

document.addEventListener('DOMContentLoaded', initialize);

export function initialize() {
  marked.setOptions({
    gfm: true,
    breaks: true,
  });

  const inputIds = ['details', 'gif-url', 'technologies', 'dependencies', 'local-configuration', 'testing', 'support'];
  inputIds.forEach(addInputListener);

  const licenceElement = getElementById<HTMLSelectElement>('licence');
  if (licenceElement) {
    licenceElement.addEventListener('change', handleInputChange);
  }

  const detailsInput = getElementById<HTMLInputElement>('details');
  if (detailsInput) {
    detailsInput.dispatchEvent(new Event('input'));
  }

  const copyButton = getElementById('copy-output');
  if (copyButton) {
    copyButton.addEventListener('click', copyToClipboard);
  }

  const scrollToTopButton = getElementById('scroll-top');
  if (scrollToTopButton) {
    scrollToTopButton.addEventListener('click', scrollToTop);
  }

  const addQuoteButton = getElementById('add-code-quote');
  if (addQuoteButton) {
    addQuoteButton.addEventListener('click', () => addCodeQuote('local-configuration'));
  }

  const addQuoteBelowButton = getElementById('add-code-quote-below');
  if (addQuoteBelowButton) {
    addQuoteBelowButton.addEventListener('click', () => addCodeQuote('testing'));
  }
}

function addInputListener(inputId: string) {
  const inputElement = getElementById<HTMLInputElement>(inputId);
  if (inputElement) {
    inputElement.addEventListener('input', handleInputChange);
  }
}

export async function handleInputChange() {
  const markdownContent = generateMarkdown();
  const htmlContent = await marked.parse(markdownContent);
  updatePreview(markdownContent, htmlContent);
}

export function generateMarkdown(): string {
  const details = getValue<HTMLInputElement>('details').trim();
  const gifUrl = getValue<HTMLInputElement>('gif-url').trim();
  const technologies = getValue<HTMLInputElement>('technologies').split(',').map(t => t.trim()).filter(Boolean).map(t => `- ${t}`).join('\n');
  const dependencies = getValue<HTMLInputElement>('dependencies').split(',').map(r => r.trim()).filter(Boolean).map(r => `- ${r}`).join('\n');
  const localConfiguration = getValue<HTMLInputElement>('local-configuration').trim();
  const testing = getValue<HTMLInputElement>('testing').trim();
  const support = getValue<HTMLInputElement>('support').trim();
  const licence = getValue<HTMLSelectElement>('licence');
  const badgeUrl = getBadgeUrl(licence);

  let markdownContent = '';

  if (licence !== '') {
    markdownContent += `![License](${badgeUrl})\n\n`;
  }

  markdownContent += `## Summary\n\n`;
  if (details) markdownContent += `- [Details](#details)\n`;
  if (technologies) markdownContent += `- [Technologies](#technologies)\n`;
  if (dependencies) markdownContent += `- [Dependencies](#dependencies)\n`;
  if (localConfiguration) markdownContent += `- [Local Configuration](#local-configuration)\n`;
  if (testing) markdownContent += `- [Testing](#testing)\n`;
  if (support) markdownContent += `- [Support](#support)\n`;

  if (details !== '') {
    markdownContent += `## Details\n${details}\n\n`;
  }

  if (gifUrl !== '') {
    markdownContent += `![GIF](${gifUrl})\n\n`;
  }

  if (technologies !== '') {
    markdownContent += `## Technologies\n${technologies}\n\n`;
  }

  if (dependencies !== '') {
    markdownContent += `## Dependencies\n${dependencies}\n\n`;
  }

  if (localConfiguration !== '') {
    markdownContent += `## Local Configuration\n${localConfiguration}\n\n`;
  }

  if (testing !== '') {
    markdownContent += `## Testing\n${testing}\n\n`;
  }

  if (support !== '') {
    markdownContent += `## Support\n${support}\n\n`;
  }

  return markdownContent;
}

export function getBadgeUrl(licence: string): string {
  const badgeUrls: { [key: string]: string } = {
    'MIT': 'https://img.shields.io/badge/License-MIT-blue',
    'Apache-2.0': 'https://img.shields.io/badge/License-Apache%202.0-blue',
    'GPL-3.0': 'https://img.shields.io/badge/License-GPL%203.0-blue',
    'BSD-3-Clause': 'https://img.shields.io/badge/License-BSD%203--Clause-blue',
    'ISC': 'https://img.shields.io/badge/License-ISC-blue',
    'Mozilla-2.0': 'https://img.shields.io/badge/License-MPL%202.0-blue',
    'AGPL-3.0': 'https://img.shields.io/badge/License-AGPL%203.0-blue',
    'LGPL-3.0': 'https://img.shields.io/badge/License-LGPL%203.0-blue',
    'CC0-1.0': 'https://img.shields.io/badge/License-CC0%201.0-blue',
    'EPL-2.0': 'https://img.shields.io/badge/License-EPL%202.0-blue',
    'Unlicense': 'https://img.shields.io/badge/license-Unlicense-blue.svg',
  };

  return badgeUrls[licence] || '';
}
export function copyToClipboard() {
  const outputTextarea = getElementById<HTMLInputElement>('markdown-output');
  if (!outputTextarea) return;

  outputTextarea.select();
  navigator.clipboard.writeText(outputTextarea.value)
    .then(() => {
      alert('README content copied to clipboard!');
    })
    .catch((error) => {
      console.error('Failed to copy to clipboard:', error);
    });
}

export function updatePreview(markdownContent: string, htmlContent: string) {
  const previewElement = getElementById('markdown-preview');
  const outputElement = getElementById<HTMLInputElement>('markdown-output');
  if (previewElement) previewElement.innerHTML = htmlContent;
  if (outputElement) outputElement.value = markdownContent;
}

export function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
}

export function addCodeQuote(inputId: string) {
  const currentVal = getValue<HTMLInputElement>(inputId);
  const quote = '```bash\n# Insert your code quote here\n```';
  const element = getElementById<HTMLInputElement>(inputId);
  if (element) {
    element.value = `${currentVal}\n${quote}`;
    element.dispatchEvent(new Event('input'));
  }
}

export function getElementById<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

export function getValue<T extends HTMLInputElement | HTMLSelectElement>(id: string): string {
  const element = getElementById<T>(id);
  return element ? element.value : '';
}