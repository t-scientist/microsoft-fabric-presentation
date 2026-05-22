// ==========================================================================
// STATE MANAGEMENT
// ==========================================================================
let currentSlide = 1;
const totalSlides = 6;
let currentCurrency = 'USD';
const EXCHANGE_RATE = 5.15;

// Cost lookup tables (in USD)
const FABRIC_SKU_PRICES = {
  "F2-PAYG": { type: "PAYG", hourly: 0.36 },
  "F2-RES": { type: "RES", monthly: 156.33 },
  "F4-PAYG": { type: "PAYG", hourly: 0.72 },
  "F4-RES": { type: "RES", monthly: 312.67 },
  "F8-RES": { type: "RES", monthly: 625.33 },
  "F64-RES": { type: "RES", monthly: 5002.67 }
};

const AZURE_SQL_PRICES = {
  "DEV-PAUSE": { "24-7": 55.00, "5-12": 25.00, "5-10": 20.00 },
  "PROD-LIGHT": { "24-7": 200.00, "5-12": 120.00, "5-10": 100.00 },
  "PROD-HIGH": { "24-7": 850.00, "5-12": 550.00, "5-10": 450.00 }
};

const AZURE_FUNCTIONS_PRICES = {
  "LIGHT": { "24-7": 0.00, "5-12": 0.00, "5-10": 0.00 },
  "MEDIUM": { "24-7": 15.00, "5-12": 8.00, "5-10": 6.00 },
  "HEAVY": { "24-7": 85.00, "5-12": 45.00, "5-10": 35.00 }
};

const ONELAKE_PRICE_PER_GB = 0.023;

// ==========================================================================
// SLIDE NAVIGATION CONTROLLER
// ==========================================================================
function navigateSlide(direction) {
  // Update current slide index with bounds checking
  let nextSlide = currentSlide + direction;
  if (nextSlide < 1) nextSlide = 1;
  if (nextSlide > totalSlides) nextSlide = totalSlides;

  if (nextSlide === currentSlide) return;

  // Deactivate current slide
  const activeSlideEl = document.querySelector(`.slide[data-slide="${currentSlide}"]`);
  if (activeSlideEl) activeSlideEl.classList.remove('active');

  // Activate new slide
  const targetSlideEl = document.querySelector(`.slide[data-slide="${nextSlide}"]`);
  if (targetSlideEl) targetSlideEl.classList.add('active');

  currentSlide = nextSlide;
  updateNavigationUI();
}

function updateNavigationUI() {
  // Update indicator text
  const indicator = document.getElementById('slide-indicator');
  if (indicator) {
    indicator.textContent = `${currentSlide} / ${totalSlides}`;
  }

  // Update progress bar
  const progressBar = document.getElementById('presentation-progress');
  if (progressBar) {
    const percentage = (currentSlide / totalSlides) * 100;
    progressBar.style.width = `${percentage}%`;
  }

  // Disable button bounds
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  if (prevBtn) prevBtn.disabled = (currentSlide === 1);
  if (nextBtn) nextBtn.disabled = (currentSlide === totalSlides);
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'Spacebar' || e.key === ' ') {
    e.preventDefault();
    navigateSlide(1);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    navigateSlide(-1);
  }
});

// ==========================================================================
// INTERACTIVE ELEMENTS (Slide 3 Panels)
// ==========================================================================
function toggleActivePanel(panelElement) {
  // Remove active state from other panels
  const siblingPanels = panelElement.parentElement.querySelectorAll('.interactive-panel');
  siblingPanels.forEach(panel => {
    if (panel !== panelElement) {
      panel.classList.remove('active-panel');
    }
  });

  // Toggle state on clicked panel
  panelElement.classList.toggle('active-panel');
}

// ==========================================================================
// FINOPS COST SIMULATOR (Slide 5)
// ==========================================================================
function setCurrency(currency) {
  currentCurrency = currency;
  
  const btnUsd = document.getElementById('btn-usd');
  const btnBrl = document.getElementById('btn-brl');
  
  if (currency === 'USD') {
    if (btnUsd) btnUsd.classList.add('active');
    if (btnBrl) btnBrl.classList.remove('active');
  } else {
    if (btnBrl) btnBrl.classList.add('active');
    if (btnUsd) btnUsd.classList.remove('active');
  }
  
  calculateCosts();
}

function updateStorageLabel(value) {
  const label = document.getElementById('storage-val');
  if (label) label.textContent = value;
  calculateCosts();
}

function updatePbiUsersLabel(value) {
  const label = document.getElementById('pbi-users-val');
  if (label) label.textContent = value;
  calculateCosts();
}

function updateUsersLabel(value) {
  const label = document.getElementById('users-val');
  if (label) label.textContent = value;
  calculateCosts();
}

function calculateCosts() {
  try {
    const regimeEl = document.getElementById('operation-regime');
    const fabricSkuEl = document.getElementById('fabric-sku');
    const storageGbEl = document.getElementById('storage-gb');
    const azureSqlEl = document.getElementById('azure-sql');
    const azureFunctionsEl = document.getElementById('azure-functions');
    const pbiUsersEl = document.getElementById('pbi-users');
    const devopsUsersEl = document.getElementById('devops-users');

    if (!regimeEl || !fabricSkuEl || !storageGbEl || !azureSqlEl || !azureFunctionsEl || !pbiUsersEl || !devopsUsersEl) {
      console.warn("Simulator inputs are not fully rendered yet.");
      return;
    }

    const regime = regimeEl.value;
    const fabricSku = fabricSkuEl.value;
    const storageGb = parseFloat(storageGbEl.value) || 0;
    const azureSql = azureSqlEl.value;
    const azureFunctions = azureFunctionsEl.value;
    const pbiUsers = parseInt(pbiUsersEl.value) || 0;
    const devopsUsers = parseInt(devopsUsersEl.value) || 0;

    // Determine operational hours
    let hours = 730;
    if (regime === '5-12') hours = 240;
    if (regime === '5-10') hours = 200;

    // 1. Fabric Compute
    let fabricComputeCost = 0;
    const skuInfo = FABRIC_SKU_PRICES[fabricSku];
    if (!skuInfo) {
      console.warn(`SKU info for ${fabricSku} not found.`);
      return;
    }
    if (skuInfo.type === 'PAYG') {
      fabricComputeCost = skuInfo.hourly * hours;
    } else {
      fabricComputeCost = skuInfo.monthly;
    }

    // 2. OneLake Storage
    const oneLakeStorageCost = storageGb * ONELAKE_PRICE_PER_GB;

    // 3. Azure SQL Cost (Serverless scale and regime dependent)
    const azureSqlCost = (AZURE_SQL_PRICES[azureSql] && AZURE_SQL_PRICES[azureSql][regime]) || 0;

    // 4. Azure Functions Cost
    const functionsCost = (AZURE_FUNCTIONS_PRICES[azureFunctions] && AZURE_FUNCTIONS_PRICES[azureFunctions][regime]) || 0;

    // 5. Azure Key Vault (flat USD 5.00/month)
    const keyVaultCost = 5.00;

    // 6. Power BI Pro (USD 10.00/user, waived if F64 capacity selected)
    let pbiCost = 0;
    if (fabricSku !== 'F64-RES') {
      pbiCost = pbiUsers * 10.00;
    }

    // 7. Azure DevOps (USD 6.00/user - all paid as org already uses 5 free licenses)
    const devopsCost = devopsUsers * 6.00;

    // Raw Total in USD
    const totalCostUSD = fabricComputeCost + oneLakeStorageCost + azureSqlCost + functionsCost + keyVaultCost + pbiCost + devopsCost;

    // Apply exchange rate if BRL
    const rate = (currentCurrency === 'BRL') ? EXCHANGE_RATE : 1.0;
    const symbol = (currentCurrency === 'BRL') ? 'R$ ' : '$';

    const fabricComputeCostCurr = fabricComputeCost * rate;
    const oneLakeStorageCostCurr = oneLakeStorageCost * rate;
    const azureSqlCostCurr = azureSqlCost * rate;
    const functionsCostCurr = functionsCost * rate;
    const keyVaultCostCurr = keyVaultCost * rate;
    const pbiCostCurr = pbiCost * rate;
    const devopsCostCurr = devopsCost * rate;
    const totalCostCurr = totalCostUSD * rate;

    // Update UI Elements
    const symbolEl = document.getElementById('cost-currency-symbol');
    if (symbolEl) symbolEl.textContent = symbol.trim();

    const elFabric = document.getElementById('breakdown-fabric-compute');
    const elStorage = document.getElementById('breakdown-onelake-storage');
    const elSql = document.getElementById('breakdown-azure-sql');
    const elFunctions = document.getElementById('breakdown-functions');
    const elKv = document.getElementById('breakdown-key-vault');
    const elPbi = document.getElementById('breakdown-pbi');
    const elDevops = document.getElementById('breakdown-devops');

    if (elFabric) elFabric.textContent = `${symbol}${fabricComputeCostCurr.toFixed(2)}`;
    if (elStorage) elStorage.textContent = `${symbol}${oneLakeStorageCostCurr.toFixed(2)}`;
    if (elSql) elSql.textContent = `${symbol}${azureSqlCostCurr.toFixed(2)}`;
    if (elFunctions) elFunctions.textContent = `${symbol}${functionsCostCurr.toFixed(2)}`;
    if (elKv) elKv.textContent = `${symbol}${keyVaultCostCurr.toFixed(2)}`;
    if (elPbi) elPbi.textContent = `${symbol}${pbiCostCurr.toFixed(2)}`;
    if (elDevops) elDevops.textContent = `${symbol}${devopsCostCurr.toFixed(2)}`;

    // Update Key Vault static cost in controls group
    const kvDisplay = document.getElementById('kv-display-cost');
    if (kvDisplay) {
      kvDisplay.textContent = `${symbol}${keyVaultCostCurr.toFixed(2)}/mês`;
    }

    // Update Total cost with smooth count animation
    animateCounter('total-cost-val', totalCostCurr);

    // Update FinOps dynamic message
    const finopsBadge = document.getElementById('finops-badge-text');
    if (finopsBadge) {
      let msg = "";
      if (fabricSku === 'F64-RES' && pbiUsers > 0) {
        msg = `<strong>Estratégia FinOps Ativa:</strong> Licenças Power BI Pro isentas devido ao uso do Fabric F64-RES.`;
      } else if ((regime === '5-12' || regime === '5-10') && skuInfo.type === 'PAYG') {
        const savings = Math.round((1 - (hours / 730)) * 100);
        msg = `<strong>Otimização de Escala Ativa:</strong> Pausa automática de computação Fabric PAYG ativada fora do horário comercial (Economia de ~${savings}% em compute).`;
      } else if ((regime === '5-12' || regime === '5-10') && skuInfo.type === 'RES') {
        msg = `<strong>Alerta FinOps:</strong> Capacidades Reservadas (RES) possuem custos fixos 24/7. Considere usar Pay-As-You-Go para habilitar a pausa automática no regime ${regime}.`;
      } else {
        msg = `<strong>Estratégia Anti-Sobreposição Ativa:</strong> Componentes integrados e dimensionados sob demanda (SQL Serverless + Functions) sem redundância.`;
      }
      finopsBadge.innerHTML = msg;
    }
  } catch (error) {
    console.error("Error in calculateCosts:", error);
  }
}

// Smooth number counter animation
function animateCounter(elementId, targetValue) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const startValue = parseFloat(el.textContent.replace(/[^\d.-]/g, '')) || 0;
  const duration = 400; // milliseconds
  const startTime = performance.now();

  function updateCounter(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease-out cubic formula
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentValue = startValue + (targetValue - startValue) * easeProgress;
    
    el.textContent = currentValue.toFixed(2);

    if (progress < 1) {
      requestAnimationFrame(updateCounter);
    }
  }

  requestAnimationFrame(updateCounter);
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
  updateNavigationUI();
  calculateCosts();
});
