/* ============================================================
   Shirley 日记 - 主应用逻辑
   包含 7 大模块：记账 / 待办 / 运动 / 生理期 / 风格 / 单词 / 壁纸
   数据全部使用 localStorage 本地存储
   ============================================================ */

// ===== 全局状态 =====
const App = {
  currentPage: 'home',
  data: {}
};

// ===== 数据 Key =====
const STORAGE_KEY = 'shirley-diary-data';

// ===== 工具函数 =====
function $(s, p) { return (p || document).querySelector(s); }
function $$(s, p) { return (p || document).querySelectorAll(s); }
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function today() { return new Date().toISOString().split('T')[0]; }
function fmtDate(d) {
  const date = d ? new Date(d) : new Date();
  return `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日`;
}
function fmtMonth(d) {
  const date = d ? new Date(d) : new Date();
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
}
function weekday(d) {
  const wd = ['日','一','二','三','四','五','六'];
  return '星期' + wd[(d || new Date()).getDay()];
}
function greeting() {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 11) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

// ===== 数据持久化 =====
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      App.data = JSON.parse(raw);
    }
  } catch(e) { console.warn('加载数据失败', e); }

  // 确保各字段存在
  const defaults = {
    expenses: [],
    incomes: [],
    fixedIncome: 0,
    todos: {},          // { '2026-01-01': [{text, done}] }
    workouts: [],       // [{date, duration, weight}]
    periodLogs: [],     // [{startDate, endDate, flow, symptoms}]
    styles: [],         // [{name, desc, budget, materials, image}]
    vocab: [],          // [{word, phonetic, meaning, example, mastered, date}]
    readingDays: 0,
    wallpaper: null,
    starredWallpapers: []
  };
  for (const k in defaults) {
    if (App.data[k] === undefined) App.data[k] = defaults[k];
  }
  saveData();
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(App.data));
  } catch(e) { console.warn('保存数据失败', e); }
}

// ===== 名言库 =====
const QUOTES = [
  { text: '生活不是等待暴风雨过去，而是学会在雨中翩翩起舞。', source: '—— 佚名' },
  { text: '你今天的努力，是幸运的伏笔。', source: '—— 佚名' },
  { text: '愿你成为自己的太阳，无需借谁的光。', source: '—— 《理想的下午》' },
  { text: '每一个不曾起舞的日子，都是对生命的辜负。', source: '—— 尼采' },
  { text: '慢慢来，比较快。', source: '—— 佚名' },
  { text: '做你自己，因为别人都有人做了。', source: '—— 奥斯卡·王尔德' },
  { text: '星光不问赶路人，时光不负有心人。', source: '—— 佚名' },
  { text: '所有的美好，都值得用心等待。', source: '—— 佚名' },
  { text: '当你全心全意梦想着什么的时候，整个宇宙都会协同起来，助你实现。', source: '—— 保罗·柯艾略《牧羊少年奇幻之旅》' },
  { text: '我们一路奔跑，只为追上那个被自己寄予厚望的自己。', source: '—— 佚名' },
  { text: '愿你历尽千帆，归来仍是少年。', source: '—— 苏轼（化用）' },
  { text: '生活中最美好的东西，都是免费的。', source: '—— 佚名' },
  { text: '保持热爱，奔赴山海。', source: '—— 佚名' },
  { text: '你的气质里，藏着你读过的书和走过的路。', source: '—— 三毛' },
  { text: '心若向阳，无谓悲伤。', source: '—— 佚名' },
  { text: '今天是你余生中最年轻的一天。', source: '—— 佚名' }
];

function getDailyQuote() {
  const day = Math.floor(Date.now() / 86400000);
  return QUOTES[day % QUOTES.length];
}

function getRandomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

// ===== 每日推荐书籍 =====
const BOOKS = [
  { title: '小王子', author: '安托万·德·圣埃克苏佩里', desc: '一个来自小行星的王子，用纯真的眼睛看世界。', reason: '当你觉得世界太复杂时，这本书会让你重新看见简单。' },
  { title: '活着', author: '余华', desc: '讲述福贵历经人生苦难仍坚强活着的故事。', reason: '理解生命的韧性，珍惜当下的每一天。' },
  { title: '解忧杂货店', author: '东野圭吾', desc: '一间能解答烦恼的神奇杂货店，串联起几代人的人生。', reason: '温暖的治愈系小说，适合安静的夜晚阅读。' },
  { title: '百年孤独', author: '加西亚·马尔克斯', desc: '布恩迪亚家族七代人的传奇故事。', reason: '魔幻现实主义经典，让人思考时间与孤独。' },
  { title: '房思琪的初恋乐园', author: '林奕含', desc: '一个关于伤痛与勇气的故事。', reason: '直面痛苦，理解坚强，珍惜被善待的幸运。' },
  { title: '人间值得', author: '中村恒子', desc: '90岁心理医生的人生智慧。', reason: '人生不必太用力，坦率过好每一天就好。' },
  { title: '被讨厌的勇气', author: '岸见一郎', desc: '阿德勒心理学对话录。', reason: '帮你找到自由和幸福的勇气。' },
  { title: '云边有个小卖部', author: '张嘉佳', desc: '回到故乡小卖部的温暖故事。', reason: '关于亲情与成长，让人笑着流泪。' },
  { title: '当下的力量', author: '埃克哈特·托利', desc: '引导你专注于当下，找到内心宁静。', reason: '当焦虑来袭时，这本书是最好的解药。' },
  { title: '月亮与六便士', author: '毛姆', desc: '一个证券经纪人追逐绘画梦想的故事。', reason: '在理想与现实的夹缝中，找到属于自己的答案。' },
  { title: '挪威的森林', author: '村上春树', desc: '青春、爱情与迷茫的故事。', reason: '关于成长中的孤独与温柔。' },
  { title: '岛上书店', author: '加布瑞埃拉·泽文', desc: '一家小岛书店里发生的故事。', reason: '没有谁是一座孤岛，每本书都是一个世界。' },
  { title: '非暴力沟通', author: '马歇尔·卢森堡', desc: '学会用爱与理解去沟通。', reason: '改善人际关系，让表达更温暖。' },
  { title: '人间失格', author: '太宰治', desc: '一个边缘人的自白。', reason: '理解黑暗，才能更好地拥抱光明。' },
  { title: '追风筝的人', author: '卡勒德·胡赛尼', desc: '关于友谊、背叛与救赎。', reason: '为你，千千万万遍。' }
];

function getDailyBook() {
  const day = Math.floor(Date.now() / 86400000);
  return BOOKS[day % BOOKS.length];
}

// ===== 每日单词库 =====
const VOCAB_POOL = [
  { word: 'serendipity', phonetic: '/ˌserənˈdɪpəti/', meaning: 'n. 意外发现美好事物的能力', example: 'Finding this cafe was pure serendipity.' },
  { word: 'resilient', phonetic: '/rɪˈzɪliənt/', meaning: 'adj. 有韧性的；能迅速恢复的', example: 'She is resilient in the face of adversity.' },
  { word: 'ephemeral', phonetic: '/ɪˈfemərəl/', meaning: 'adj. 短暂的；瞬息的', example: 'The beauty of cherry blossoms is ephemeral.' },
  { word: 'candid', phonetic: '/ˈkændɪd/', meaning: 'adj. 坦率的；直言不讳的', example: 'He gave a candid answer to the question.' },
  { word: 'nostalgia', phonetic: '/nɒˈstældʒə/', meaning: 'n. 怀旧；乡愁', example: 'The old photos filled her with nostalgia.' },
  { word: 'tranquil', phonetic: '/ˈtræŋkwɪl/', meaning: 'adj. 宁静的；平静的', example: 'The lake was tranquil in the morning.' },
  { word: 'vibrant', phonetic: '/ˈvaɪbrənt/', meaning: 'adj. 充满活力的；鲜艳的', example: 'The market was vibrant with colors.' },
  { word: 'profound', phonetic: '/prəˈfaʊnd/', meaning: 'adj. 深刻的；深远的', example: 'The book had a profound impact on me.' },
  { word: 'gratitude', phonetic: '/ˈɡrætɪtjuːd/', meaning: 'n. 感激；感恩', example: 'She expressed her gratitude with a smile.' },
  { word: 'curiosity', phonetic: '/ˌkjʊəriˈɒsəti/', meaning: 'n. 好奇心', example: 'Curiosity drives us to explore the world.' },
  { word: 'authentic', phonetic: '/ɔːˈθentɪk/', meaning: 'adj. 真实的；可靠的', example: 'This is an authentic Italian recipe.' },
  { word: 'cherish', phonetic: '/ˈtʃerɪʃ/', meaning: 'v. 珍惜；珍爱', example: 'I cherish every moment with my family.' },
  { word: 'radiant', phonetic: '/ˈreɪdiənt/', meaning: 'adj. 容光焕发的；灿烂的', example: 'She looked radiant on her wedding day.' },
  { word: 'solitude', phonetic: '/ˈsɒlɪtjuːd/', meaning: 'n. 独处；孤独', example: 'He enjoys the solitude of reading alone.' },
  { word: 'whimsical', phonetic: '/ˈwɪmzɪkəl/', meaning: 'adj. 异想天开的；古怪的', example: 'The story had a whimsical charm.' },
  { word: 'genuine', phonetic: '/ˈdʒenjuɪn/', meaning: 'adj. 真诚的；真正的', example: 'Her smile was warm and genuine.' },
  { word: 'contemplate', phonetic: '/ˈkɒntəmpleɪt/', meaning: 'v. 沉思；细想', example: 'He sat by the river to contemplate life.' },
  { word: 'enchanting', phonetic: '/ɪnˈtʃɑːntɪŋ/', meaning: 'adj. 迷人的；陶醉的', example: 'The sunset was absolutely enchanting.' },
  { word: 'diligent', phonetic: '/ˈdɪlɪdʒənt/', meaning: 'adj. 勤奋的；用功的', example: 'She is a diligent student who never gives up.' },
  { word: 'cozy', phonetic: '/ˈkəʊzi/', meaning: 'adj. 舒适的；惬意的', example: 'The cafe was warm and cozy on a rainy day.' }
];

function getDailyVocab() {
  const day = Math.floor(Date.now() / 86400000);
  // 每天 10 个，循环抽取
  const start = (day * 10) % VOCAB_POOL.length;
  const result = [];
  for (let i = 0; i < 10; i++) {
    result.push(VOCAB_POOL[(start + i) % VOCAB_POOL.length]);
  }
  return result;
}

// ===== 支出类别配置 =====
const EXPENSE_CATEGORIES = [
  { name: '餐饮', icon: '🍽️', color: '#FF9A8B' },
  { name: '交通', icon: '🚗', color: '#A8EDEA' },
  { name: '购物', icon: '🛍️', color: '#FAD0C4' },
  { name: '娱乐', icon: '🎮', color: '#FFD1FF' },
  { name: '居家', icon: '🏠', color: '#84FAB0' },
  { name: '医疗', icon: '💊', color: '#FEE140' },
  { name: '教育', icon: '📚', color: '#8FD3F4' },
  { name: '美容', icon: '💄', color: '#F093FB' },
  { name: '通讯', icon: '📱', color: '#30CFD0' },
  { name: '其他', icon: '📦', color: '#C0C4CC' }
];

function getCatConfig(name) {
  return EXPENSE_CATEGORIES.find(c => c.name === name) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
}

// ===== 装修风格预设 =====
const STYLE_PRESETS = [
  { name: '现代简约', icon: '🏢', desc: '简洁线条，功能至上，色彩以黑白灰为主。', budget: '5-15万' },
  { name: '北欧风格', icon: '🌲', desc: '自然材质，明亮色彩，温馨舒适。', budget: '6-18万' },
  { name: '日式原木', icon: '🏡', desc: '原木色为主，留白空间，禅意宁静。', budget: '8-20万' },
  { name: '中式风格', icon: '🏮', desc: '传统元素，对称布局，典雅大气。', budget: '10-30万' },
  { name: '轻奢风格', icon: '✨', desc: '金属点缀，质感面料，低调奢华。', budget: '12-35万' },
  { name: '法式复古', icon: '🌹', desc: '石膏线，拱形门，浪漫优雅。', budget: '10-28万' },
  { name: '工业风', icon: '🏭', desc: '裸露砖墙，金属管道，粗犷个性。', budget: '6-16万' },
  { name: '奶油风', icon: '🍦', desc: '奶白米色系，柔和温暖，少女心满满。', budget: '5-14万' }
];

// ===== 壁纸列表 =====
// 动态从 wallpapers 目录加载（如果 JS 中内置列表为空则用默认）
const WALLPAPERS = [
  // 戴花小猫主题
  { id: 'cat-flower-green', name: '小猫·绿野', path: 'wallpapers/cat-flower-green.jpg', tag: 'cat' },
  { id: 'cat-flower-pink', name: '小猫·粉樱', path: 'wallpapers/cat-flower-pink.jpg', tag: 'cat' },
  { id: 'cat-flower-purple', name: '小猫·紫雾', path: 'wallpapers/cat-flower-purple.jpg', tag: 'cat' },
  { id: 'cat-flower-yellow', name: '小猫·暖阳', path: 'wallpapers/cat-flower-yellow.jpg', tag: 'cat' },
  // 樱花
  { id: 'sakura-rain', name: '樱花飘落', path: 'wallpapers/sakura-rain.jpg', tag: 'flower' },
  { id: 'plant-sakura', name: '粉色樱花', path: 'wallpapers/plant-sakura.jpg', tag: 'flower' },
  { id: 'plant-lavender', name: '薰衣草', path: 'wallpapers/plant-lavender.jpg', tag: 'flower' },
  { id: 'plant-rose', name: '玫瑰园', path: 'wallpapers/plant-rose.jpg', tag: 'flower' },
  { id: 'plant-peach', name: '桃花', path: 'wallpapers/plant-peach.jpg', tag: 'flower' },
  { id: 'plant-leaf', name: '绿叶', path: 'wallpapers/plant-leaf.jpg', tag: 'flower' },
  // 天空
  { id: 'sky-sunset', name: '日落余晖', path: 'wallpapers/sky-sunset.jpg', tag: 'sky' },
  { id: 'sky-sunset2', name: '夕阳西下', path: 'wallpapers/sky-sunset2.jpg', tag: 'sky' },
  { id: 'sky-dawn', name: '黎明', path: 'wallpapers/sky-dawn.jpg', tag: 'sky' },
  { id: 'sky-pinkdawn', name: '粉霞清晨', path: 'wallpapers/sky-pinkdawn.jpg', tag: 'sky' },
  { id: 'sky-clear', name: '晴空', path: 'wallpapers/sky-clear.jpg', tag: 'sky' },
  { id: 'sky-pink-cloud', name: '粉色云海', path: 'wallpapers/sky-pink-cloud.jpg', tag: 'sky' },
  { id: 'sky-blue-cloud', name: '蓝色云海', path: 'wallpapers/sky-blue-cloud.jpg', tag: 'sky' },
  { id: 'sky-orange-cloud', name: '橙色云海', path: 'wallpapers/sky-orange-cloud.jpg', tag: 'sky' },
  // 自然
  { id: 'nature-ocean', name: '海洋', path: 'wallpapers/nature-ocean.jpg', tag: 'nature' },
  { id: 'nature-forest', name: '森林', path: 'wallpapers/nature-forest.jpg', tag: 'nature' },
  { id: 'nature-sunset-clouds', name: '夕阳云', path: 'wallpapers/nature-sunset-clouds.jpg', tag: 'nature' },
  { id: 'nature-meadow', name: '草地', path: 'wallpapers/nature-meadow.jpg', tag: 'nature' },
  { id: 'nature-river', name: '溪流', path: 'wallpapers/nature-river.jpg', tag: 'nature' },
  { id: 'mountain-sunset', name: '山川日落', path: 'wallpapers/mountain-sunset.jpg', tag: 'nature' },
  { id: 'aurora-night', name: '极光之夜', path: 'wallpapers/aurora-night.jpg', tag: 'nature' },
  // 渐变纯色
  { id: 'soft-pink', name: '樱花粉', path: 'wallpapers/soft-pink.jpg', tag: 'pure' },
  { id: 'soft-rose', name: '玫瑰粉', path: 'wallpapers/soft-rose.jpg', tag: 'pure' },
  { id: 'soft-purple', name: '梦幻紫', path: 'wallpapers/soft-purple.jpg', tag: 'pure' },
  { id: 'soft-sky', name: '天空蓝', path: 'wallpapers/soft-sky.jpg', tag: 'pure' },
  { id: 'soft-mint', name: '薄荷绿', path: 'wallpapers/soft-mint.jpg', tag: 'pure' },
  { id: 'soft-cream', name: '奶油白', path: 'wallpapers/soft-cream.jpg', tag: 'pure' },
  { id: 'soft-peach', name: '蜜桃色', path: 'wallpapers/soft-peach.jpg', tag: 'pure' },
  { id: 'soft-coral', name: '珊瑚橙', path: 'wallpapers/soft-coral.jpg', tag: 'pure' },
  { id: 'soft-lilac', name: '丁香紫', path: 'wallpapers/soft-lilac.jpg', tag: 'pure' },
  { id: 'soft-gray', name: '雾灰', path: 'wallpapers/soft-gray.jpg', tag: 'pure' },
  { id: 'soft-warmgray', name: '暖灰', path: 'wallpapers/soft-warmgray.jpg', tag: 'pure' },
  // 食物甜品
  { id: 'food-strawberry', name: '草莓奶', path: 'wallpapers/food-strawberry.jpg', tag: 'food' },
  { id: 'food-matcha', name: '抹茶绿', path: 'wallpapers/food-matcha.jpg', tag: 'food' },
  { id: 'food-peach', name: '蜜桃茶', path: 'wallpapers/food-peach.jpg', tag: 'food' },
  // 季节
  { id: 'season-spring', name: '春', path: 'wallpapers/season-spring.jpg', tag: 'season' },
  { id: 'season-summer', name: '夏', path: 'wallpapers/season-summer.jpg', tag: 'season' },
  { id: 'season-autumn', name: '秋', path: 'wallpapers/season-autumn.jpg', tag: 'season' },
  { id: 'season-winter', name: '冬', path: 'wallpapers/season-winter.jpg', tag: 'season' },
  // 纯色
  { id: 'pure-pink', name: '纯粉', path: 'wallpapers/pure-pink.jpg', tag: 'pure' },
  { id: 'pure-blue', name: '纯蓝', path: 'wallpapers/pure-blue.jpg', tag: 'pure' },
  { id: 'pure-cream', name: '纯奶白', path: 'wallpapers/pure-cream.jpg', tag: 'pure' },
  { id: 'pure-gray', name: '纯灰', path: 'wallpapers/pure-gray.jpg', tag: 'pure' }
];

// ===== 导航初始化 =====
function initNav() {
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      $$('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      switchPage(page);
      // 移动端关闭侧边栏
      if (window.innerWidth <= 768) {
        $('#sidebar').classList.remove('open');
        $('#sidebar-overlay').classList.remove('active');
      }
    });
  });

  $('#menu-toggle').addEventListener('click', () => {
    $('#sidebar').classList.toggle('open');
    $('#sidebar-overlay').classList.toggle('active');
  });

  $('#sidebar-overlay').addEventListener('click', () => {
    $('#sidebar').classList.remove('open');
    $('#sidebar-overlay').classList.remove('active');
  });

  $('#btn-backup').addEventListener('click', backupData);
}

function switchPage(page) {
  App.currentPage = page;
  const titles = {
    home: '首页', finance: '记账', todo: '当日待办', fitness: '运动 / 体重',
    period: '生理期', style: '风格', words: '单词阅读', wallpaper: '壁纸'
  };
  $('#page-title').textContent = titles[page] || '首页';
  $('#header-date').textContent = fmtDate(new Date()) + ' ' + weekday(new Date());

  const container = $('#page-container');
  container.innerHTML = '';

  switch(page) {
    case 'home': renderHome(container); break;
    case 'finance': renderFinance(container); break;
    case 'todo': renderTodo(container); break;
    case 'fitness': renderFitness(container); break;
    case 'period': renderPeriod(container); break;
    case 'style': renderStyle(container); break;
    case 'words': renderWords(container); break;
    case 'wallpaper': renderWallpaper(container); break;
  }
  container.scrollTop = 0;
}

// ============================================================
// 模块 1：首页
// ============================================================
function renderHome(c) {
  const quote = getDailyQuote();
  const t = new Date();

  c.innerHTML = `
    <div class="home-hero">
      <!-- 戴花小猫 -->
      <img class="cat-svg" src="icon-180.png" alt="猫猫" style="border-radius:50%;width:120px;height:120px;object-fit:cover;animation:catSway 3s ease-in-out infinite;transform-origin:center bottom;" />

      <div class="home-greeting">${greeting()}，Shirley 🐱</div>
      <div class="home-date">${fmtDate(t)} ${weekday(t)}</div>
    </div>

    <!-- 每日名言 -->
    <div class="quote-card" id="quote-card">
      <div class="quote-text" id="quote-text">${esc(quote.text)}</div>
      <div class="quote-source" id="quote-source">${esc(quote.source)}</div>
      <button class="quote-refresh" id="quote-refresh">🎲 换一句</button>
    </div>

    <!-- 快捷入口 -->
    <div class="quick-grid" id="quick-grid">
      <div class="quick-tile" data-page="finance">
        <div class="quick-icon" style="background:linear-gradient(135deg,#FF9A8B,#FF6A88);">💰</div>
        <div class="quick-name">记账</div>
        <div class="quick-stat">${getFinanceStat()}</div>
      </div>
      <div class="quick-tile" data-page="todo">
        <div class="quick-icon" style="background:linear-gradient(135deg,#84FAB0,#8FD3F4);">✅</div>
        <div class="quick-name">待办</div>
        <div class="quick-stat">${getTodoStat()}</div>
      </div>
      <div class="quick-tile" data-page="fitness">
        <div class="quick-icon" style="background:linear-gradient(135deg,#FA709A,#FEE140);">💪</div>
        <div class="quick-name">运动</div>
        <div class="quick-stat">${getFitnessStat()}</div>
      </div>
      <div class="quick-tile" data-page="period">
        <div class="quick-icon" style="background:linear-gradient(135deg,#FFB6C1,#FF9FAE);">🌸</div>
        <div class="quick-name">生理期</div>
        <div class="quick-stat">${getPeriodStat()}</div>
      </div>
      <div class="quick-tile" data-page="style">
        <div class="quick-icon" style="background:linear-gradient(135deg,#A8EDEA,#FED6E3);">🛋️</div>
        <div class="quick-name">风格</div>
        <div class="quick-stat">${App.data.styles.length} 个收藏</div>
      </div>
      <div class="quick-tile" data-page="words">
        <div class="quick-icon" style="background:linear-gradient(135deg,#5EE7DF,#B490CA);">📚</div>
        <div class="quick-name">单词</div>
        <div class="quick-stat">${getVocabStat()}</div>
      </div>
      <div class="quick-tile" data-page="wallpaper">
        <div class="quick-icon" style="background:linear-gradient(135deg,#FF8B95,#FFB85C);">🖼️</div>
        <div class="quick-name">壁纸</div>
        <div class="quick-stat">${WALLPAPERS.length}+ 张精选</div>
      </div>
      <div class="quick-tile" data-page="finance">
        <div class="quick-icon" style="background:linear-gradient(135deg,#30CFD0,#330867);">📊</div>
        <div class="quick-name">汇总</div>
        <div class="quick-stat">查看月报</div>
      </div>
    </div>
  `;

  // 名言切换
  $('#quote-refresh').addEventListener('click', () => {
    const q = getRandomQuote();
    const card = $('#quote-card');
    card.style.opacity = '0';
    card.style.transition = 'opacity 0.3s';
    setTimeout(() => {
      $('#quote-text').textContent = q.text;
      $('#quote-source').textContent = q.source;
      card.style.opacity = '1';
    }, 300);
  });

  // 快捷入口点击
  $$('.quick-tile', c).forEach(t => {
    t.addEventListener('click', () => {
      const p = t.dataset.page;
      $$('.nav-item').forEach(n => n.classList.remove('active'));
      const navItem = $(`.nav-item[data-page="${p}"]`);
      if (navItem) navItem.classList.add('active');
      switchPage(p);
    });
  });
}

function getFinanceStat() {
  const m = fmtMonth();
  const total = App.data.expenses.filter(e => e.date && e.date.startsWith(m)).reduce((s, e) => s + e.amount, 0);
  return `本月 ¥${total.toFixed(0)}`;
}
function getTodoStat() {
  const t = App.data.todos[today()];
  if (!t || !t.length) return '今日无待办';
  const done = t.filter(x => x.done).length;
  return `${done}/${t.length} 已完成`;
}
function getFitnessStat() {
  const todayLog = App.data.workouts.find(w => w.date === today());
  if (todayLog) return `今日 ${todayLog.duration}分钟`;
  return '今日未运动';
}
function getPeriodStat() {
  if (!App.data.periodLogs.length) return '点击记录';
  const last = App.data.periodLogs[App.data.periodLogs.length - 1];
  const next = new Date(last.startDate);
  next.setDate(next.getDate() + 28);
  const days = Math.ceil((next - new Date()) / 86400000);
  if (days > 0 && days <= 3) return `${days}天后到来`;
  if (days <= 0) return '可能进行中';
  return `预计 ${days}天后`;
}
function getVocabStat() {
  const mastered = App.data.vocab.filter(v => v.mastered).length;
  return `已掌握 ${mastered} 词`;
}

// ============================================================
// 模块 2：记账
// ============================================================
function renderFinance(c) {
  const m = fmtMonth();
  const monthExp = App.data.expenses.filter(e => e.date && e.date.startsWith(m));
  const totalExp = monthExp.reduce((s, e) => s + e.amount, 0);
  const totalInc = App.data.incomes.filter(e => e.date && e.date.startsWith(m)).reduce((s, e) => s + e.amount, 0) + (App.data.fixedIncome || 0);
  const balance = totalInc - totalExp;

  c.innerHTML = `
    <!-- 汇总卡片 -->
    <div class="finance-summary">
      <div class="summary-card">
        <div class="summary-label">本月支出</div>
        <div class="summary-value expense">¥${totalExp.toFixed(2)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">本月收入</div>
        <div class="summary-value income">¥${totalInc.toFixed(2)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">结余</div>
        <div class="summary-value balance">¥${balance.toFixed(2)}</div>
      </div>
    </div>

    <!-- 支出板块 -->
    <div class="card">
      <div class="card-title">💸 支出记录</div>
      <div class="input-row">
        <div class="input-group">
          <label>日期</label>
          <input class="input" type="date" id="exp-date" value="${today()}" />
        </div>
        <div class="input-group">
          <label>类别</label>
          <select class="input" id="exp-cat">
            ${EXPENSE_CATEGORIES.map(cat => `<option value="${cat.name}">${cat.icon} ${cat.name}</option>`).join('')}
          </select>
        </div>
        <div class="input-group" style="max-width:120px;">
          <label>价格 (¥)</label>
          <input class="input" type="number" step="0.01" id="exp-amount" placeholder="0.00" />
        </div>
      </div>
      <div class="input-row">
        <div class="input-group">
          <label>备注</label>
          <input class="input" id="exp-note" placeholder="支出备注..." />
        </div>
        <button class="btn" id="exp-add" style="align-self:flex-end;">添加支出</button>
      </div>
      <!-- 筛选 -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0;" id="exp-filter">
        <span class="tag active" data-filter="all">全部</span>
        ${EXPENSE_CATEGORIES.map(cat => `<span class="tag" data-filter="${cat.name}">${cat.icon} ${cat.name}</span>`).join('')}
      </div>
      <!-- 支出列表 -->
      <div id="exp-list"></div>
    </div>

    <!-- 饼图统计 -->
    <div class="card">
      <div class="card-title">📊 支出分类占比</div>
      <div class="pie-chart" id="pie-chart"></div>
    </div>

    <!-- 条形图 -->
    <div class="card">
      <div class="card-title">📈 每日支出趋势</div>
      <div class="bar-chart" id="bar-chart"></div>
    </div>

    <!-- 收入板块 -->
    <div class="card">
      <div class="card-title">💰 收入记录</div>
      <div class="input-row">
        <div class="input-group">
          <label>月固定收入 (¥)</label>
          <input class="input" type="number" step="0.01" id="fixed-income" value="${App.data.fixedIncome || ''}" placeholder="如：8000" />
        </div>
        <button class="btn btn-secondary" id="save-fixed" style="align-self:flex-end;">保存固定</button>
      </div>
      <div class="input-row">
        <div class="input-group">
          <label>其他收入 (¥)</label>
          <input class="input" type="number" step="0.01" id="inc-amount" placeholder="金额" />
        </div>
        <div class="input-group">
          <label>备注</label>
          <input class="input" id="inc-note" placeholder="如：兼职、红包" />
        </div>
        <button class="btn" id="inc-add" style="align-self:flex-end;">添加收入</button>
      </div>
      <div style="display:flex;gap:16px;margin:12px 0;flex-wrap:wrap;">
        <div class="info-pill">固定收入：<strong>¥${(App.data.fixedIncome||0).toFixed(2)}</strong></div>
        <div class="info-pill">其他收入：<strong>¥${App.data.incomes.filter(e=>e.date&&e.date.startsWith(m)).reduce((s,e)=>s+e.amount,0).toFixed(2)}</strong></div>
        <div class="info-pill">总收入：<strong>¥${totalInc.toFixed(2)}</strong></div>
      </div>
      <div id="inc-list"></div>
    </div>
  `;

  let currentFilter = 'all';

  function renderExpList() {
    const list = $('#exp-list');
    let items = monthExp.slice().reverse();
    if (currentFilter !== 'all') items = items.filter(e => e.category === currentFilter);
    if (!items.length) {
      list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💸</div><div class="empty-state-text">本月还没有支出记录</div></div>';
      return;
    }
    list.innerHTML = items.map(e => {
      const cat = getCatConfig(e.category);
      return `
        <div class="expense-item">
          <div class="expense-icon" style="background:${cat.color}22;">${cat.icon}</div>
          <div class="expense-info">
            <div class="expense-cat">${esc(e.category)}</div>
            ${e.note ? `<div class="expense-note">${esc(e.note)}</div>` : ''}
            <div class="expense-date">${esc(e.date)}</div>
          </div>
          <div class="expense-amount">-¥${e.amount.toFixed(2)}</div>
          <button class="todo-delete" data-exp-del="${e.id}">×</button>
        </div>
      `;
    }).join('');
    list.querySelectorAll('[data-exp-del]').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.dataset.expDel;
        App.data.expenses = App.data.expenses.filter(e => e.id !== id);
        saveData();
        switchPage('finance');
      });
    });
  }

  function renderIncList() {
    const list = $('#inc-list');
    const items = App.data.incomes.filter(e => e.date && e.date.startsWith(m)).reverse();
    if (!items.length) {
      list.innerHTML = '<div class="empty-state-text" style="padding:12px;">暂无其他收入</div>';
      return;
    }
    list.innerHTML = items.map(e => `
      <div class="expense-item">
        <div class="expense-icon" style="background:#84FAB022;">💵</div>
        <div class="expense-info">
          <div class="expense-cat">其他收入</div>
          ${e.note ? `<div class="expense-note">${esc(e.note)}</div>` : ''}
          <div class="expense-date">${esc(e.date)}</div>
        </div>
        <div class="expense-amount" style="color:var(--success);">+¥${e.amount.toFixed(2)}</div>
        <button class="todo-delete" data-inc-del="${e.id}">×</button>
      </div>
    `).join('');
    list.querySelectorAll('[data-inc-del]').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.dataset.incDel;
        App.data.incomes = App.data.incomes.filter(e => e.id !== id);
        saveData();
        switchPage('finance');
      });
    });
  }

  function renderPieChart() {
    const cats = {};
    monthExp.forEach(e => { cats[e.category] = (cats[e.category] || 0) + e.amount; });
    const total = Object.values(cats).reduce((s, v) => s + v, 0);
    const chart = $('#pie-chart');
    if (total === 0) {
      chart.innerHTML = '<div class="empty-state-text">暂无数据</div>';
      return;
    }

    // 用 SVG conic-gradient 模拟饼图
    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    let acc = 0;
    const slices = sorted.map(([name, val]) => {
      const pct = val / total;
      const cat = getCatConfig(name);
      const start = acc * 360;
      acc += pct;
      const end = acc * 360;
      return { name, val, pct, color: cat.color, icon: cat.icon, start, end };
    });

    // SVG 饼图
    const r = 80, cx = 90, cy = 90;
    let svgSlices = '';
    slices.forEach(s => {
      const a1 = (s.start - 90) * Math.PI / 180;
      const a2 = (s.end - 90) * Math.PI / 180;
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
      const large = s.end - s.start > 180 ? 1 : 0;
      svgSlices += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${s.color}" stroke="white" stroke-width="2"/>`;
    });

    const legend = slices.map(s => `
      <div class="legend-item">
        <div class="legend-color" style="background:${s.color};"></div>
        <span>${s.icon} ${esc(s.name)} ¥${s.val.toFixed(0)} (${(s.pct*100).toFixed(0)}%)</span>
      </div>
    `).join('');

    chart.innerHTML = `
      <svg width="180" height="180" viewBox="0 0 180 180">
        ${svgSlices}
        <circle cx="90" cy="90" r="36" fill="white"/>
        <text x="90" y="86" text-anchor="middle" font-size="14" font-weight="700" fill="#2C3E50">¥${total.toFixed(0)}</text>
        <text x="90" y="102" text-anchor="middle" font-size="11" fill="#909399">总计</text>
      </svg>
      <div class="pie-legend">${legend}</div>
    `;
  }

  function renderBarChart() {
    // 当月每日支出
    const year = new Date().getFullYear();
    const month = new Date().getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today_d = new Date().getDate();
    // 显示最近 14 天
    const startDay = Math.max(1, today_d - 13);
    const data = [];
    for (let d = startDay; d <= today_d; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const total = App.data.expenses.filter(e => e.date === dateStr).reduce((s, e) => s + e.amount, 0);
      data.push({ day: d, total });
    }
    const max = Math.max(...data.map(d => d.total), 1);
    $('#bar-chart').innerHTML = data.map(d => `
      <div class="bar-item">
        <div class="bar" style="height:${(d.total/max)*100}%;" title="¥${d.total.toFixed(0)}"></div>
        <div class="bar-label">${d.day}</div>
      </div>
    `).join('');
  }

  // 事件绑定
  $('#exp-add').addEventListener('click', () => {
    const date = $('#exp-date').value;
    const category = $('#exp-cat').value;
    const amount = parseFloat($('#exp-amount').value);
    const note = $('#exp-note').value.trim();
    if (!date || isNaN(amount) || amount <= 0) { alert('请填写日期和有效金额'); return; }
    App.data.expenses.push({ id: 'e' + Date.now(), date, category, amount, note });
    saveData();
    switchPage('finance');
  });

  $('#exp-filter').querySelectorAll('.tag').forEach(t => {
    t.addEventListener('click', () => {
      $('#exp-filter').querySelectorAll('.tag').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      currentFilter = t.dataset.filter;
      renderExpList();
    });
  });

  $('#save-fixed').addEventListener('click', () => {
    App.data.fixedIncome = parseFloat($('#fixed-income').value) || 0;
    saveData();
    alert('固定收入已保存');
    switchPage('finance');
  });

  $('#inc-add').addEventListener('click', () => {
    const amount = parseFloat($('#inc-amount').value);
    const note = $('#inc-note').value.trim();
    if (isNaN(amount) || amount <= 0) { alert('请输入有效金额'); return; }
    App.data.incomes.push({ id: 'i' + Date.now(), date: today(), amount, note });
    saveData();
    switchPage('finance');
  });

  renderExpList();
  renderIncList();
  renderPieChart();
  renderBarChart();
}

// ============================================================
// 模块 3：当日待办
// ============================================================
function renderTodo(c) {
  const t = today();
  const todayTodos = App.data.todos[t] || [];

  c.innerHTML = `
    <div class="card">
      <div class="card-title">✅ 今日待办（${todayTodos.filter(x=>x.done).length}/${todayTodos.length}）</div>
      <div class="input-row">
        <input class="input" id="todo-input" placeholder="输入待办事项，回车添加..." />
        <button class="btn" id="todo-add">添加</button>
      </div>
      <div id="todo-list"></div>
    </div>

    <div class="card">
      <div class="card-title">📅 历史记录</div>
      <div class="input-row">
        <input class="input" type="date" id="history-date" value="${t}" />
      </div>
      <div id="history-list"></div>
    </div>
  `;

  function renderTodoList() {
    const list = $('#todo-list');
    const todos = App.data.todos[t] || [];
    if (!todos.length) {
      list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-text">今日还没有待办，添加一个吧</div></div>';
      return;
    }
    list.innerHTML = todos.map((todo, i) => `
      <div class="todo-item">
        <div class="todo-number">${i + 1}</div>
        <div class="todo-checkbox ${todo.done ? 'checked' : ''}" data-idx="${i}">${todo.done ? '✓' : ''}</div>
        <div class="todo-text ${todo.done ? 'done' : ''}">${esc(todo.text)}</div>
        <button class="todo-delete" data-del="${i}">✕</button>
      </div>
    `).join('');

    list.querySelectorAll('.todo-checkbox').forEach(cb => {
      cb.addEventListener('click', () => {
        const idx = parseInt(cb.dataset.idx);
        App.data.todos[t][idx].done = !App.data.todos[t][idx].done;
        saveData();
        renderTodoList();
        $('#page-title').textContent = `当日待办（${App.data.todos[t].filter(x=>x.done).length}/${App.data.todos[t].length}）`;
      });
    });

    list.querySelectorAll('[data-del]').forEach(b => {
      b.addEventListener('click', () => {
        const idx = parseInt(b.dataset.del);
        App.data.todos[t].splice(idx, 1);
        if (App.data.todos[t].length === 0) delete App.data.todos[t];
        saveData();
        renderTodoList();
      });
    });
  }

  function renderHistory() {
    const date = $('#history-date').value;
    const todos = App.data.todos[date] || [];
    const list = $('#history-list');
    if (date === t) {
      list.innerHTML = '<div class="empty-state-text">以上是今日待办</div>';
      return;
    }
    if (!todos.length) {
      list.innerHTML = `<div class="empty-state-text">${esc(date)} 没有待办记录</div>`;
      return;
    }
    list.innerHTML = todos.map((todo, i) => `
      <div class="todo-item">
        <div class="todo-number">${i + 1}</div>
        <div class="todo-checkbox ${todo.done ? 'checked' : ''}">${todo.done ? '✓' : ''}</div>
        <div class="todo-text ${todo.done ? 'done' : ''}">${esc(todo.text)}</div>
      </div>
    `).join('');
  }

  $('#todo-add').addEventListener('click', addTodo);
  $('#todo-input').addEventListener('keypress', e => { if (e.key === 'Enter') addTodo(); });

  function addTodo() {
    const input = $('#todo-input');
    if (!input.value.trim()) return;
    if (!App.data.todos[t]) App.data.todos[t] = [];
    App.data.todos[t].push({ text: input.value.trim(), done: false });
    saveData();
    input.value = '';
    renderTodoList();
    $('#page-title').textContent = `当日待办（${App.data.todos[t].filter(x=>x.done).length}/${App.data.todos[t].length}）`;
  }

  $('#history-date').addEventListener('change', renderHistory);

  renderTodoList();
  renderHistory();
}

// ============================================================
// 模块 4：运动 / 体重
// ============================================================
function renderFitness(c) {
  const t = today();
  const todayLog = App.data.workouts.find(w => w.date === t);
  const recentWeights = App.data.workouts.filter(w => w.weight).slice(-7);
  const lastWeight = recentWeights[recentWeights.length - 1];
  const prevWeight = recentWeights[recentWeights.length - 2];

  c.innerHTML = `
    <div class="card">
      <div class="card-title">💪 今日打卡</div>
      <div class="input-row">
        <div class="input-group">
          <label>日期</label>
          <input class="input" type="date" id="workout-date" value="${t}" />
        </div>
        <div class="input-group">
          <label>锻炼时长 (分钟)</label>
          <input class="input" type="number" id="workout-duration" value="${todayLog?.duration || ''}" placeholder="0" />
        </div>
        <div class="input-group">
          <label>体重 (kg)</label>
          <input class="input" type="number" step="0.1" id="workout-weight" value="${todayLog?.weight || ''}" placeholder="00.0" />
        </div>
      </div>
      <button class="btn" id="workout-save">保存记录</button>
    </div>

    <div class="card">
      <div class="card-title">⚖️ 体重变化</div>
      <div class="weight-display">
        <div class="weight-card">
          <div class="weight-label">最新体重</div>
          <div class="weight-value">${lastWeight ? lastWeight.weight : '--'}<span class="weight-unit"> kg</span></div>
          ${lastWeight && prevWeight ? `<div class="weight-diff ${(lastWeight.weight < prevWeight.weight) ? 'down' : 'up'}">${lastWeight.weight < prevWeight.weight ? '↓' : '↑'} ${Math.abs(lastWeight.weight - prevWeight.weight).toFixed(1)} kg</div>` : ''}
        </div>
        <div class="weight-card">
          <div class="weight-label">上次体重</div>
          <div class="weight-value">${prevWeight ? prevWeight.weight : '--'}<span class="weight-unit"> kg</span></div>
        </div>
      </div>
      <!-- 体重趋势线图 -->
      <svg id="weight-chart" width="100%" height="140" style="margin-top:12px;"></svg>
    </div>

    <div class="card">
      <div class="card-title">📊 本周锻炼频率</div>
      <div class="bar-chart" id="fitness-bar"></div>
      <div style="margin-top:8px;font-size:13px;color:var(--text-secondary);">
        本周锻炼 <strong>${getWeekWorkoutCount()}</strong> 次，共 <strong>${getWeekWorkoutDuration()}</strong> 分钟
      </div>
    </div>

    <div class="card">
      <div class="card-title">🔔 锻炼提醒</div>
      <div style="display:flex;align-items:center;gap:10px;">
        <label style="flex:1;font-size:14px;">每日提醒（每日 18:00）</label>
        <input type="checkbox" id="fitness-reminder" ${App.data.fitnessReminder ? 'checked' : ''} style="width:20px;height:20px;" />
      </div>
    </div>

    <div class="card">
      <div class="card-title">📋 近期记录</div>
      <div id="workout-history"></div>
    </div>
  `;

  $('#workout-save').addEventListener('click', () => {
    const date = $('#workout-date').value;
    const duration = parseInt($('#workout-duration').value) || 0;
    const weight = parseFloat($('#workout-weight').value);
    if (!date) return;
    // 查找或创建
    let log = App.data.workouts.find(w => w.date === date);
    if (log) {
      log.duration = duration;
      if (!isNaN(weight)) log.weight = weight;
    } else {
      App.data.workouts.push({ id: 'w' + Date.now(), date, duration, weight: isNaN(weight) ? null : weight });
    }
    saveData();
    switchPage('fitness');
  });

  $('#fitness-reminder').addEventListener('change', e => {
    App.data.fitnessReminder = e.target.checked;
    saveData();
    if (e.target.checked) {
      alert('已开启每日锻炼提醒（需要保持浏览器/APP 打开才能收到通知）');
    }
  });

  renderWeightChart(recentWeights);
  renderFitnessBar();
  renderWorkoutHistory();
}

function getWeekWorkoutCount() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return App.data.workouts.filter(w => new Date(w.date) >= weekStart && w.duration > 0).length;
}

function getWeekWorkoutDuration() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return App.data.workouts.filter(w => new Date(w.date) >= weekStart && w.duration > 0).reduce((s, w) => s + w.duration, 0);
}

function renderWeightChart(weights) {
  const svg = $('#weight-chart');
  if (!weights || weights.length < 2) {
    svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#C0C4CC" font-size="13">需要至少 2 条记录才能显示趋势</text>';
    return;
  }
  const w = svg.clientWidth || 300;
  const h = 140;
  const pad = 30;
  const minW = Math.min(...weights.map(x => x.weight)) - 1;
  const maxW = Math.max(...weights.map(x => x.weight)) + 1;
  const range = maxW - minW || 1;

  const points = weights.map((d, i) => {
    const x = pad + (i / (weights.length - 1)) * (w - pad * 2);
    const y = h - pad - ((d.weight - minW) / range) * (h - pad * 2);
    return { x, y, weight: d.weight, date: d.date };
  });

  const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + ` ${p.x} ${p.y}`).join(' ');
  const dots = points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#7BB5F0"/><text x="${p.x}" y="${p.y - 10}" text-anchor="middle" font-size="10" fill="#606266">${p.weight}</text>`).join('');

  svg.innerHTML = `
    <path d="${pathD}" stroke="#7BB5F0" stroke-width="2" fill="none" stroke-linejoin="round"/>
    ${dots}
  `;
}

function renderFitnessBar() {
  const now = new Date();
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const log = App.data.workouts.find(w => w.date === dateStr);
    data.push({ day: ['日','一','二','三','四','五','六'][d.getDay()], duration: log ? log.duration : 0 });
  }
  const max = Math.max(...data.map(d => d.duration), 60);
  $('#fitness-bar').innerHTML = data.map(d => `
    <div class="bar-item">
      <div class="bar" style="height:${(d.duration/max)*100}%;background:linear-gradient(180deg,#FA709A,#FEE140);"></div>
      <div class="bar-label">${d.day}</div>
    </div>
  `).join('');
}

function renderWorkoutHistory() {
  const list = $('#workout-history');
  const items = App.data.workouts.slice().reverse().slice(0, 10);
  if (!items.length) {
    list.innerHTML = '<div class="empty-state-text">还没有运动记录</div>';
    return;
  }
  list.innerHTML = items.map(w => `
    <div class="list-item">
      <span style="font-size:20px;">${w.duration > 0 ? '🏃' : '⚖️'}</span>
      <div style="flex:1;">
        <div style="font-size:14px;font-weight:500;">${esc(w.date)}</div>
        <div style="font-size:12px;color:var(--text-tertiary);">
          ${w.duration > 0 ? `锻炼 ${w.duration} 分钟` : ''} ${w.weight ? `· 体重 ${w.weight}kg` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// ============================================================
// 模块 5：生理期
// ============================================================
function renderPeriod(c) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // 预测下次
  let predicted = null;
  if (App.data.periodLogs.length) {
    const last = App.data.periodLogs[App.data.periodLogs.length - 1];
    predicted = new Date(last.startDate);
    predicted.setDate(predicted.getDate() + 28);
  }

  c.innerHTML = `
    <div class="card">
      <div class="card-title">🌸 生理期记录</div>
      <div class="input-row">
        <div class="input-group">
          <label>开始日期</label>
          <input class="input" type="date" id="period-start" />
        </div>
        <div class="input-group">
          <label>结束日期</label>
          <input class="input" type="date" id="period-end" />
        </div>
      </div>
      <div class="input-row">
        <div class="input-group">
          <label>经血量</label>
          <select class="input" id="period-flow">
            <option value="light">少量</option>
            <option value="normal">正常</option>
            <option value="heavy">大量</option>
          </select>
        </div>
        <div class="input-group">
          <label>症状备注</label>
          <input class="input" id="period-symptoms" placeholder="如：腹痛、疲劳" />
        </div>
      </div>
      <button class="btn" id="period-add">添加记录</button>
    </div>

    ${predicted ? `
    <div class="card">
      <div class="card-title">🔮 下次预测</div>
      <div style="text-align:center;padding:16px;">
        <div style="font-size:14px;color:var(--text-tertiary);">预计下次生理期</div>
        <div style="font-size:24px;font-weight:700;color:var(--accent-pink-dark);margin:8px 0;">
          ${predicted.getFullYear()}年${predicted.getMonth()+1}月${predicted.getDate()}日
        </div>
        <div style="font-size:13px;color:var(--text-secondary);">
          ${Math.ceil((predicted - now) / 86400000) > 0 ? `还有 ${Math.ceil((predicted - now) / 86400000)} 天` : '可能已到来'}
        </div>
        ${Math.ceil((predicted - now) / 86400000) > 0 && Math.ceil((predicted - now) / 86400000) <= 3 ? '<div style="margin-top:8px;color:var(--warning);font-size:13px;">⚠️ 生理期即将到来，请做好准备</div>' : ''}
      </div>
    </div>` : ''}

    <div class="card">
      <div class="card-title">📅 日历视图</div>
      <div id="period-calendar"></div>
    </div>

    <div class="card">
      <div class="card-title">📋 历史记录</div>
      <div id="period-history"></div>
    </div>
  `;

  $('#period-add').addEventListener('click', () => {
    const startDate = $('#period-start').value;
    const endDate = $('#period-end').value;
    const flow = $('#period-flow').value;
    const symptoms = $('#period-symptoms').value.trim();
    if (!startDate) { alert('请选择开始日期'); return; }
    App.data.periodLogs.push({ id: 'p' + Date.now(), startDate, endDate, flow, symptoms });
    App.data.periodLogs.sort((a, b) => a.startDate.localeCompare(b.startDate));
    saveData();
    switchPage('period');
  });

  renderPeriodCalendar(year, month, predicted);
  renderPeriodHistory();
}

function renderPeriodCalendar(year, month, predicted) {
  const container = $('#period-calendar');
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = today();

  // 收集本月生理期日期
  const periodDays = new Set();
  App.data.periodLogs.forEach(log => {
    if (!log.startDate) return;
    const start = new Date(log.startDate);
    const end = log.endDate ? new Date(log.endDate) : start;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getFullYear() === year && d.getMonth() === month) {
        periodDays.add(d.getDate());
      }
    }
  });

  // 预测日期
  const predictedDays = new Set();
  if (predicted && predicted.getFullYear() === year && predicted.getMonth() === month) {
    for (let i = 0; i < 5; i++) {
      const d = new Date(predicted);
      d.setDate(d.getDate() + i);
      if (d.getMonth() === month) predictedDays.add(d.getDate());
    }
  }

  let html = '<div style="text-align:center;font-size:16px;font-weight:600;margin-bottom:10px;">' + year + '年' + (month + 1) + '月</div>';
  html += '<div class="period-calendar">';
  ['日','一','二','三','四','五','六'].forEach(w => html += `<div class="calendar-header">${w}</div>`);
  for (let i = 0; i < firstDay; i++) html += '<div class="calendar-day empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    let cls = 'calendar-day';
    if (dateStr === todayStr) cls += ' today';
    if (periodDays.has(d)) cls += ' period';
    else if (predictedDays.has(d)) cls += ' predicted';
    html += `<div class="${cls}">${d}</div>`;
  }
  html += '</div>';
  html += '<div class="period-info"><div class="info-pill"><span style="background:#FFB6C1;width:12px;height:12px;border-radius:3px;display:inline-block;"></span> 生理期</div><div class="info-pill"><span style="background:#FF9FAE;opacity:0.4;width:12px;height:12px;border-radius:3px;display:inline-block;"></span> 预测期</div></div>';
  container.innerHTML = html;
}

function renderPeriodHistory() {
  const list = $('#period-history');
  const items = App.data.periodLogs.slice().reverse();
  if (!items.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🌸</div><div class="empty-state-text">还没有记录</div></div>';
    return;
  }
  const flowMap = { light: '少量', normal: '正常', heavy: '大量' };
  list.innerHTML = items.map(p => `
    <div class="list-item">
      <span style="font-size:20px;">🌸</span>
      <div style="flex:1;">
        <div style="font-size:14px;font-weight:500;">${esc(p.startDate)} ${p.endDate ? '→ ' + esc(p.endDate) : ''}</div>
        <div style="font-size:12px;color:var(--text-tertiary);">经量：${flowMap[p.flow] || '正常'} ${p.symptoms ? '· ' + esc(p.symptoms) : ''}</div>
      </div>
      <button class="todo-delete" data-del="${p.id}">✕</button>
    </div>
  `).join('');
  list.querySelectorAll('[data-del]').forEach(b => {
    b.addEventListener('click', () => {
      App.data.periodLogs = App.data.periodLogs.filter(p => p.id !== b.dataset.del);
      saveData();
      switchPage('period');
    });
  });
}

// ============================================================
// 模块 6：风格
// ============================================================
function renderStyle(c) {
  c.innerHTML = `
    <div class="card">
      <div class="card-title">🛋️ 装修风格收藏</div>
      <div class="input-row">
        <input class="input" id="style-search" placeholder="搜索风格..." />
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
        <span class="tag active" data-filter="all">全部</span>
        ${STYLE_PRESETS.map(s => `<span class="tag" data-filter="${s.name}">${s.icon} ${s.name}</span>`).join('')}
      </div>

      <!-- 预设风格 -->
      <h4 style="margin:12px 0 8px;font-size:14px;color:var(--text-secondary);">预设风格</h4>
      <div class="style-grid" id="preset-grid"></div>

      <h4 style="margin:16px 0 8px;font-size:14px;color:var(--text-secondary);">我的收藏</h4>
      <button class="btn" id="style-add" style="margin-bottom:12px;">+ 添加自定义风格</button>
      <div class="style-grid" id="custom-grid"></div>
    </div>
  `;

  let currentFilter = 'all';
  let searchKey = '';

  function renderPresets() {
    const grid = $('#preset-grid');
    let items = STYLE_PRESETS;
    if (currentFilter !== 'all') items = items.filter(s => s.name === currentFilter);
    if (searchKey) items = items.filter(s => s.name.includes(searchKey) || s.desc.includes(searchKey));
    grid.innerHTML = items.map(s => `
      <div class="style-card" data-preset="${esc(s.name)}">
        <div class="style-image">${s.icon}</div>
        <div class="style-info">
          <div class="style-name">${esc(s.name)}</div>
          <div class="style-desc">${esc(s.desc)}</div>
          <div class="style-budget">预算：${esc(s.budget)}</div>
        </div>
      </div>
    `).join('');
    grid.querySelectorAll('[data-preset]').forEach(card => {
      card.addEventListener('click', () => {
        const name = card.dataset.preset;
        const preset = STYLE_PRESETS.find(p => p.name === name);
        // 收藏到自定义
        if (!App.data.styles.find(s => s.name === preset.name)) {
          App.data.styles.push({ id: 's' + Date.now(), name: preset.name, desc: preset.desc, budget: preset.budget, materials: '', image: '', icon: preset.icon });
          saveData();
          renderCustom();
          alert(`已收藏「${name}」`);
        } else {
          alert('已收藏过此风格');
        }
      });
    });
  }

  function renderCustom() {
    const grid = $('#custom-grid');
    let items = App.data.styles;
    if (currentFilter !== 'all') items = items.filter(s => s.name === currentFilter);
    if (searchKey) items = items.filter(s => s.name.includes(searchKey) || (s.desc && s.desc.includes(searchKey)));
    if (!items.length) {
      grid.innerHTML = '<div class="empty-state-text" style="grid-column:1/-1;padding:20px;">还没有收藏的风格</div>';
      return;
    }
    grid.innerHTML = items.map(s => `
      <div class="style-card" data-id="${s.id}">
        <div class="style-image">${s.image ? `<img src="${esc(s.image)}" />` : (s.icon || '🛋️')}</div>
        <div class="style-info">
          <div class="style-name">${esc(s.name)}</div>
          <div class="style-desc">${esc(s.desc || '暂无描述')}</div>
          ${s.budget ? `<div class="style-budget">预算：${esc(s.budget)}</div>` : ''}
          ${s.materials ? `<div style="font-size:12px;color:var(--text-tertiary);margin-top:4px;">材料：${esc(s.materials)}</div>` : ''}
        </div>
      </div>
    `).join('');
    grid.querySelectorAll('[data-id]').forEach(card => {
      card.addEventListener('click', () => editStyle(card.dataset.id));
    });
  }

  $('#style-search').addEventListener('input', e => { searchKey = e.target.value.trim(); renderPresets(); renderCustom(); });
  $('#style-add').addEventListener('click', () => editStyle(null));
  document.querySelectorAll('[data-filter]').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      currentFilter = t.dataset.filter;
      renderPresets();
      renderCustom();
    });
  });

  renderPresets();
  renderCustom();
}

function editStyle(id) {
  const style = id ? App.data.styles.find(s => s.id === id) : null;
  const overlay = el('div', 'modal-overlay');
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-title">${style ? '编辑风格' : '添加自定义风格'}</div>
      <div class="input-group" style="margin-bottom:10px;">
        <label>风格名称</label>
        <input class="input" id="modal-name" value="${style ? esc(style.name) : ''}" placeholder="如：美式复古" />
      </div>
      <div class="input-group" style="margin-bottom:10px;">
        <label>描述</label>
        <textarea class="input" id="modal-desc" rows="3" placeholder="风格描述...">${style ? esc(style.desc) : ''}</textarea>
      </div>
      <div class="input-group" style="margin-bottom:10px;">
        <label>预算</label>
        <input class="input" id="modal-budget" value="${style ? esc(style.budget) : ''}" placeholder="如：8-15万" />
      </div>
      <div class="input-group" style="margin-bottom:10px;">
        <label>材料清单</label>
        <textarea class="input" id="modal-materials" rows="2" placeholder="如：实木地板、乳胶漆...">${style ? esc(style.materials) : ''}</textarea>
      </div>
      <div class="input-group" style="margin-bottom:10px;">
        <label>图片 URL（可选）</label>
        <input class="input" id="modal-image" value="${style ? esc(style.image) : ''}" placeholder="粘贴图片链接" />
      </div>
      <div class="modal-actions">
        ${style ? '<button class="btn btn-danger btn-sm" id="modal-delete">删除</button>' : ''}
        <button class="btn btn-secondary btn-sm" id="modal-cancel">取消</button>
        <button class="btn btn-sm" id="modal-save">保存</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  $('#modal-cancel').addEventListener('click', () => overlay.remove());
  $('#modal-save').addEventListener('click', () => {
    const name = $('#modal-name').value.trim();
    if (!name) { alert('请输入名称'); return; }
    const data = {
      name,
      desc: $('#modal-desc').value.trim(),
      budget: $('#modal-budget').value.trim(),
      materials: $('#modal-materials').value.trim(),
      image: $('#modal-image').value.trim()
    };
    if (style) {
      Object.assign(style, data);
    } else {
      App.data.styles.push({ id: 's' + Date.now(), ...data, icon: '🛋️' });
    }
    saveData();
    overlay.remove();
    switchPage('style');
  });

  if (style) {
    $('#modal-delete').addEventListener('click', () => {
      if (confirm('确定删除？')) {
        App.data.styles = App.data.styles.filter(s => s.id !== id);
        saveData();
        overlay.remove();
        switchPage('style');
      }
    });
  }
}

// ============================================================
// 模块 7：单词阅读
// ============================================================
function renderWords(c) {
  const dailyVocab = getDailyVocab();
  const book = getDailyBook();
  const masteredCount = App.data.vocab.filter(v => v.mastered).length;
  const totalCount = App.data.vocab.length;

  c.innerHTML = `
    <div class="book-card">
      <div style="font-size:12px;opacity:0.8;margin-bottom:4px;">📖 今日推荐书籍</div>
      <div class="book-title">${esc(book.title)}</div>
      <div class="book-author">作者：${esc(book.author)}</div>
      <div class="book-desc">${esc(book.desc)}</div>
      <div class="book-reason">💡 推荐理由：${esc(book.reason)}</div>
    </div>

    <div class="card">
      <div class="card-title">📊 学习进度</div>
      <div style="display:flex;gap:16px;margin-bottom:10px;">
        <div class="info-pill">📅 已学 <strong>${App.data.readingDays}</strong> 天</div>
        <div class="info-pill">📚 累计 <strong>${totalCount}</strong> 词</div>
        <div class="info-pill">✅ 已掌握 <strong>${masteredCount}</strong> 词</div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${totalCount ? (masteredCount/totalCount*100) : 0}%;"></div>
      </div>
      <div style="font-size:12px;color:var(--text-tertiary);margin-top:4px;">
        掌握率：${totalCount ? (masteredCount/totalCount*100).toFixed(0) : 0}%
      </div>
    </div>

    <div class="card">
      <div class="card-title">📝 今日 10 词</div>
      <div id="vocab-list"></div>
    </div>
  `;

  // 渲染单词列表
  const list = $('#vocab-list');

  // 确保今日单词入库
  const todayKey = 'vocab-' + today();
  if (!App.data[todayKey]) {
    dailyVocab.forEach(v => {
      if (!App.data.vocab.find(x => x.word === v.word)) {
        App.data.vocab.push({ ...v, mastered: false, date: today() });
      }
    });
    App.data[todayKey] = true;
    App.data.readingDays++;
    saveData();
  }

  list.innerHTML = dailyVocab.map(v => {
    const saved = App.data.vocab.find(x => x.word === v.word);
    const mastered = saved ? saved.mastered : false;
    return `
      <div class="word-card ${mastered ? 'mastered' : ''}" data-word="${esc(v.word)}">
        <div class="word-status ${mastered ? 'mastered' : ''}">${mastered ? '✓' : ''}</div>
        <div class="word-content">
          <div>
            <span class="word-term">${esc(v.word)}</span>
            <span class="word-phonetic">${esc(v.phonetic)}</span>
          </div>
          <div class="word-meaning">${esc(v.meaning)}</div>
          <div class="word-example">${esc(v.example)}</div>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.word-card').forEach(card => {
    card.addEventListener('click', () => {
      const word = card.dataset.word;
      const item = App.data.vocab.find(x => x.word === word);
      if (item) {
        item.mastered = !item.mastered;
        saveData();
        switchPage('words');
      }
    });
  });
}

// ============================================================
// 模块 8：壁纸
// ============================================================
function renderWallpaper(c) {
  const tags = [
    { id: 'all', name: '全部' },
    { id: 'cat', name: '🐱 戴花小猫' },
    { id: 'sky', name: '☁️ 天空' },
    { id: 'nature', name: '🌿 自然' },
    { id: 'flower', name: '🌸 花卉' },
    { id: 'pure', name: '🎨 渐变' },
    { id: 'food', name: '🍰 食物' },
    { id: 'season', name: '🍂 四季' }
  ];
  let currentTag = 'all';

  c.innerHTML = `
    <div class="card">
      <div class="card-title">🖼️ 精选壁纸库 (${WALLPAPERS.length}+)</div>
      <p style="font-size:13px;color:var(--text-tertiary);margin-bottom:14px;">点击壁纸切换背景 · 长按收藏</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;" id="tag-filters">
        ${tags.map(t => `<span class="tag ${t.id === 'all' ? 'active' : ''}" data-tag="${t.id}">${t.name}</span>`).join('')}
      </div>
      <div class="wallpaper-grid" id="wallpaper-grid"></div>
    </div>

    <div class="card">
      <div class="card-title">⭐ 我的收藏</div>
      <div class="wallpaper-grid" id="starred-grid"></div>
    </div>

    <div class="card">
      <div class="card-title">📤 自定义壁纸</div>
      <div class="input-row">
        <input class="input" id="custom-wp-url" placeholder="粘贴图片 URL..." />
        <button class="btn" id="custom-wp-apply">应用</button>
      </div>
      <input type="file" id="custom-wp-file" accept="image/*" style="margin-top:8px;padding:10px;background:var(--bg-soft);border-radius:12px;width:100%;font-size:13px;color:var(--text-secondary);" />
    </div>

    <div class="card">
      <button class="btn btn-secondary" id="reset-wallpaper" style="width:100%;">🔄 恢复默认背景</button>
    </div>
  `;

  function getFilteredWallpapers() {
    if (currentTag === 'all') return WALLPAPERS;
    return WALLPAPERS.filter(wp => wp.tag === currentTag);
  }

  function renderGrid() {
    const grid = $('#wallpaper-grid');
    const list = getFilteredWallpapers();
    grid.innerHTML = list.map(wp => `
      <div class="wallpaper-tile ${App.data.wallpaper === wp.id ? 'active' : ''} ${App.data.starredWallpapers.includes(wp.id) ? 'starred' : ''}" data-wp="${wp.id}">
        <img src="${wp.path}" alt="${wp.name}" loading="lazy" />
        <div class="wallpaper-name">${wp.name}</div>
      </div>
    `).join('');

    if (!list.length) {
      grid.innerHTML = '<div class="empty-state-text" style="grid-column:1/-1;padding:24px;">此分类暂无壁纸</div>';
    }

    grid.querySelectorAll('.wallpaper-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const id = tile.dataset.wp;
        App.data.wallpaper = id;
        applyWallpaper(id);
        saveData();
        renderGrid();
        renderStarred();
      });
      // 长按收藏
      let pressTimer;
      tile.addEventListener('touchstart', () => {
        pressTimer = setTimeout(() => {
          toggleStar(tile.dataset.wp);
        }, 600);
      });
      tile.addEventListener('touchend', () => clearTimeout(pressTimer));
      tile.addEventListener('contextmenu', e => {
        e.preventDefault();
        toggleStar(tile.dataset.wp);
      });
    });
  }

  function renderStarred() {
    const grid = $('#starred-grid');
    const starred = WALLPAPERS.filter(wp => App.data.starredWallpapers.includes(wp.id));
    if (!starred.length) {
      grid.innerHTML = '<div class="empty-state-text" style="grid-column:1/-1;padding:20px;">长按或右键壁纸可收藏</div>';
      return;
    }
    grid.innerHTML = starred.map(wp => `
      <div class="wallpaper-tile ${App.data.wallpaper === wp.id ? 'active' : ''} starred" data-wp="${wp.id}">
        <img src="${wp.path}" alt="${wp.name}" loading="lazy" />
        <div class="wallpaper-name">${wp.name}</div>
      </div>
    `).join('');
    grid.querySelectorAll('.wallpaper-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const id = tile.dataset.wp;
        App.data.wallpaper = id;
        applyWallpaper(id);
        saveData();
        renderGrid();
        renderStarred();
      });
    });
  }

  function toggleStar(id) {
    const idx = App.data.starredWallpapers.indexOf(id);
    if (idx >= 0) {
      App.data.starredWallpapers.splice(idx, 1);
    } else {
      App.data.starredWallpapers.push(id);
    }
    saveData();
    renderGrid();
    renderStarred();
  }

  // 绑定 tag 筛选
  $('#tag-filters').querySelectorAll('.tag').forEach(t => {
    t.addEventListener('click', () => {
      $('#tag-filters').querySelectorAll('.tag').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      currentTag = t.dataset.tag;
      renderGrid();
    });
  });

  $('#custom-wp-apply').addEventListener('click', () => {
    const url = $('#custom-wp-url').value.trim();
    if (!url) return;
    App.data.wallpaper = 'custom:' + url;
    applyCustomWallpaper(url);
    saveData();
  });

  $('#custom-wp-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      App.data.wallpaper = 'custom:' + ev.target.result;
      applyCustomWallpaper(ev.target.result);
      saveData();
    };
    reader.readAsDataURL(file);
  });

  $('#reset-wallpaper').addEventListener('click', () => {
    App.data.wallpaper = null;
    document.body.classList.remove('has-wallpaper');
    document.body.style.backgroundImage = '';
    saveData();
    alert('已恢复默认背景');
  });

  renderGrid();
  renderStarred();
}

function applyWallpaper(id) {
  const wp = WALLPAPERS.find(w => w.id === id);
  if (!wp) return;
  document.body.classList.add('has-wallpaper');
  document.body.style.backgroundImage = `url(${wp.path})`;
}

function applyCustomWallpaper(url) {
  document.body.classList.add('has-wallpaper');
  document.body.style.backgroundImage = `url(${url})`;
}

function restoreWallpaper() {
  if (App.data.wallpaper) {
    if (App.data.wallpaper.startsWith('custom:')) {
      applyCustomWallpaper(App.data.wallpaper.slice(7));
    } else {
      applyWallpaper(App.data.wallpaper);
    }
  }
}

// ============================================================
// 数据备份
// ============================================================
function backupData() {
  const data = JSON.stringify(App.data, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shirley-diary-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// 初始化
// ============================================================
function init() {
  loadData();
  $('#nav-date').textContent = fmtDate(new Date());
  initNav();
  restoreWallpaper();
  switchPage('home');
}

document.addEventListener('DOMContentLoaded', init);