const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  // 1. 캡처할 경로 리스트 (원하는 만큼 추가하세요!)
  const routes = [
    { name: 'main', path: '/' },
    { name: 'signin', path: '/signin' },
    { name: 'signup', path: '/signup' },
    { name: 'find-account', path: '/find-account' },
    { name: 'settings', path: '/settings' },
    { name: 'challenges', path: '/challenges' },
    { name: 'challenge', path: '/challenges/1' },
    { name: 'challenges_create', path: '/challenges/create' },
    { name: 'contests', path: '/contests' },
    { name: 'contest', path: '/contests/1' },
    { name: 'contests_create', path: '/contests/create' },  
    { name: 'groups', path: '/groups' }, 
    { name: 'group', path: '/groups/1' }, 
    { name: 'groups_create', path: '/groups/create' }
  ];

  // 2. 저장할 폴더 생성 (screenshots/2026-03-30 형식)
  const dateStr = new Date().toISOString().split('T')[0];
  const saveDir = path.join(__dirname, 'screenshots', dateStr);
  
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

  console.log(`🚀 [DK-World] 자동 캡처를 시작합니다. 저장 위치: ${saveDir}`);

  // 3. 브라우저 실행
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // 브라우저 크기 설정 (데스크탑 기준)
  await page.setViewportSize({ width: 1400, height: 900 });

  for (const route of routes) {
    const targetUrl = `http://localhost:3000${route.path}`;
    const timestamp = new Date().getHours().toString().padStart(2, '0') + 
                      new Date().getMinutes().toString().padStart(2, '0');
    const fileName = `${timestamp}_${route.name}.png`;
    const filePath = path.join(saveDir, fileName);

    try {
      console.log(`📸 캡처 중: ${route.path} -> ${fileName}`);
      
      // 페이지 이동 (네트워크가 조용해질 때까지 대기)
      await page.goto(targetUrl, { waitUntil: 'networkidle' });
      
      // 실제 캡처 (fullPage: true로 설정하면 스크롤 끝까지 찍어줍니다)
      await page.screenshot({ path: filePath, fullPage: true });
      
    } catch (err) {
      console.error(`❌ ${route.path} 캡처 실패:`, err.message);
    }
  }

  await browser.close();
  console.log('\n✅ 모든 페이지 캡처 완료! 이제 "screenshots" 폴더를 확인해 보세요.');
})();