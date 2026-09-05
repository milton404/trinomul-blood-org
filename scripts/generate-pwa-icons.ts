// PWA Icon Generator - Run this to create all required PWA icons
// Usage: npx tsx scripts/generate-pwa-icons.ts

import fs from 'fs';
import path from 'path';

const ICONS_DIR = path.join(process.cwd(), 'public', 'icons');
const SCREENSHOTS_DIR = path.join(process.cwd(), 'public', 'screenshots');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

function generateSVGIcon(size: number): string {
  const bgColor = '#dc2626'; // Red-600
  const textColor = '#ffffff';
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="${bgColor}"/>
  <g transform="translate(${size * 0.5}, ${size * 0.45})">
    <path d="M0,-${size * 0.15} C-${size * 0.08},-${size * 0.05} -${size * 0.08},${size * 0.06} 0,${size * 0.12} C${size * 0.04},${size * 0.18} ${size * 0.1},${size * 0.22} ${size * 0.12},${size * 0.22}" 
          fill="none" stroke="${textColor}" stroke-width="${size * 0.03}" stroke-linecap="round"/>
    <path d="M${size * 0.08},-${size * 0.02} C${size * 0.14},-${size * 0.01} ${size * 0.18},${size * 0.03} ${size * 0.2},${size * 0.07} C${size * 0.2},${size * 0.11} ${size * 0.16},${size * 0.15} ${size * 0.12},${size * 0.15}"
          fill="none" stroke="${textColor}" stroke-width="${size * 0.03}" stroke-linecap="round"/>
  </g>
  <text x="50%" y="${size * 0.85}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${size * 0.1}" font-weight="bold" fill="${textColor}">B+</text>
</svg>`;
}

async function main() {
  // Create directories
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
    console.log('✅ Created icons directory');
  }
  
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    console.log('✅ Created screenshots directory');
  }

  // Generate SVG icons for each size
  for (const size of sizes) {
    const svg = generateSVGIcon(size);
    const filename = `icon-${size}x${size}.png`;
    
    // Write SVG (in production, you'd convert to PNG)
    // For now we create SVG files that work in most contexts
    const svgPath = path.join(ICONS_DIR, `icon-${size}x${size}.svg`);
    fs.writeFileSync(svgPath, svg);
    console.log(`📱 Created ${filename}`);
  }

  // Create favicon
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#dc2626"/>
  <path d="M16,8 C13,12 10,15 10,18 C10,21.3 12.7,24 16,24 C19.3,24 22,21.3 22,18 C22,15 19,12 16,8Z" 
        fill="#ffffff" opacity="0.9"/>
</svg>`;
  
  fs.writeFileSync(path.join(process.cwd(), 'public', 'favicon.svg'), faviconSvg);
  console.log('✅ Created favicon.svg');

  // Create placeholder screenshots (simple colored rectangles)
  const homeScreenshot = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <rect width="1080" height="1920" fill="#ffffff"/>
  <rect y="0" width="1080" height="120" fill="#dc2626"/>
  <text x="540" y="70" text-anchor="middle" font-family="Arial" font-size="40" font-weight="bold" fill="#ffffff">Trinomul Blood Bank</text>
  <circle cx="540" cy="800" r="120" fill="#fef2f2" stroke="#dc2626" stroke-width="8"/>
  <text x="540" y="820" text-anchor="middle" font-family="Arial" font-size="80" fill="#dc2626">B+</text>
  <text x="540" y="1050" text-anchor="middle" font-family="Arial" font-size="36" fill="#374151">Find Blood Donors</text>
  <text x="540" y="1120" text-anchor="middle" font-family="Arial" font-size="28" fill="#9ca3af">Save lives in Rangpur Division</text>
  <rect x="140" y="1300" width="800" height="100" rx="50" fill="#f3f4f6"/>
  <text x="540" y="1365" text-anchor="middle" font-family="Arial" font-size="30" fill="#9ca3af">Search donors...</text>
</svg>`;

  const requestScreenshot = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <rect width="1080" height="1920" fill="#fff7ed"/>
  <rect y="0" width="1080" height="120" fill="#dc2626"/>
  <text x="540" y="70" text-anchor="middle" font-family="Arial" font-size="40" font-weight="bold" fill="#ffffff">Request Blood</text>
  <rect x="140" y="180" width="800" height="100" rx="20" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <text x="540" y="245" text-anchor="middle" font-family="Arial" font-size="32" font-weight="bold" fill="#dc2626">🚨 EMERGENCY SOS</text>
  <rect x="140" y="320" width="380" height="400" rx="20" fill="#ffffff" stroke="#e5e7eb" stroke-width="2"/>
  <text x="330" y="370" text-anchor="middle" font-family="Arial" font-size="24" fill="#374151">Patient Name</text>
  <rect x="160" y="400" width="340" height="60" rx="10" fill="#f9fafb" stroke="#d1d5db" stroke-width="2"/>
  <rect x="540" y="320" width="400" height="190" rx="20" fill="#ffffff" stroke="#e5e7eb" stroke-width="2"/>
  <text x="740" y="370" text-anchor="middle" font-family="Arial" font-size="24" fill="#374151">Blood Group</text>
  <g transform="translate(560, 390)">
    <rect x="0" y="0" width="80" height="50" rx="10" fill="#dc2626"/><text x="40" y="35" text-anchor="middle" font-size="20" fill="#fff" font-weight="bold">A+</text>
    <rect x="90" y="0" width="80" height="50" rx="10" fill="#f3f4f6"/><text x="130" y="35" text-anchor="middle" font-size="20" fill="#374151">B+</text>
    <rect x="180" y="0" width="80" height="50" rx="10" fill="#f3f4f6"/><text x="220" y="35" text-anchor="middle" font-size="20" fill="#374151">O+</text>
    <rect x="270" y="0" width="80" height="50" rx="10" fill="#f3f4f6"/><text x="310" y="35" text-anchor="middle" font-size="20" fill="#374151">AB+</text>
  </g>
  <rect x="140" y="1500" width="800" height="100" rx="50" fill="#dc2626"/>
  <text x="540" y="1565" text-anchor="middle" font-family="Arial" font-size="32" font-weight="bold" fill="#ffffff">Submit Request</text>
</svg>`;

  fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'home.svg'), homeScreenshot);
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'request.svg'), requestScreenshot);
  console.log('✅ Created screenshot placeholders');

  console.log('\n🎉 All PWA assets generated!');
  console.log('\n⚠️  Note: For production, replace these SVGs with actual PNG icons.');
  console.log('   You can use https://realfavicongenerator.net/ to generate proper icons.\n');
}

main().catch(console.error);
