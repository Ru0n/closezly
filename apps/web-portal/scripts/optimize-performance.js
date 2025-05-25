#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Running performance optimizations...\n');

// 1. Check for heavy imports
function checkHeavyImports() {
  console.log('📊 Checking for heavy imports...');

  const heavyLibraries = ['framer-motion', 'lodash', 'd3'];
  const componentsDir = path.join(__dirname, '../components');
  const appDir = path.join(__dirname, '../app');

  function scanDirectory(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    files.forEach(file => {
      if (file.isDirectory()) {
        scanDirectory(path.join(dir, file.name));
      } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
        const filePath = path.join(dir, file.name);
        const content = fs.readFileSync(filePath, 'utf8');

        heavyLibraries.forEach(lib => {
          if (content.includes(`from '${lib}'`) || content.includes(`from "${lib}"`)) {
            console.log(`⚠️  Heavy import found: ${lib} in ${filePath.replace(__dirname + '/../', '')}`);
          }
        });
      }
    });
  }

  if (fs.existsSync(componentsDir)) scanDirectory(componentsDir);
  if (fs.existsSync(appDir)) scanDirectory(appDir);
}

// 2. Check bundle size
function checkBundleSize() {
  console.log('\n📦 Bundle size recommendations:');
  console.log('• Run "npm run build:analyze" to see bundle composition');
  console.log('• Consider lazy loading heavy components');
  console.log('• Use dynamic imports for charts and animations');
}

// 3. Performance recommendations
function showRecommendations() {
  console.log('\n💡 Performance Recommendations:');
  console.log('1. Use Next.js Turbopack: npm run dev:turbo');
  console.log('2. Optimize Framer Motion imports');
  console.log('3. Use dynamic imports for heavy components');
  console.log('4. Enable SWC minification in next.config.js');
  console.log('5. Use Image optimization for profile pictures');
}

// 4. Check Node.js version
function checkNodeVersion() {
  console.log('\n🔧 Environment Check:');
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  if (majorVersion < 18) {
    console.log(`⚠️  Node.js ${nodeVersion} detected. Consider upgrading to Node.js 18+ for better performance`);
  } else {
    console.log(`✅ Node.js ${nodeVersion} - Good!`);
  }
}

// Run all checks
checkHeavyImports();
checkBundleSize();
checkNodeVersion();
showRecommendations();

console.log('\n✨ Optimization check complete!');
console.log('\nNext steps:');
console.log('1. Try: npm run dev:turbo');
console.log('2. Analyze bundle: npm run build:analyze');
console.log('3. Consider implementing lazy loading for heavy components');
