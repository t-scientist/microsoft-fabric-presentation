// ==========================================================================
// STATE MANAGEMENT
// ==========================================================================
let currentSlide = 1;
const totalSlides = 6;

// Cost lookup tables
const FABRIC_SKU_PRICES = {
  "F2-PAYG": 262.80,
  "F2-RES": 156.33,
  "F4-PAYG": 525.60,
  "F4-RES": 312.67,
  "F8-RES": 625.33,
  "F64-RES": 5002.67
};

const AZURE_SQL_PRICES = {
  "DEV-PAUSE": 55.00,
  "PROD-LIGHT": 200.00,
  "PROD-HIGH": 850.00
};

const ONELAKE_PRICE_PER_GB = 0.023;
const DEVOPS_PRICE_PER_USER = 6.00;

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
function updateStorageLabel(value) {
  const label = document.getElementById('storage-val');
  if (label) label.textContent = value;
  calculateCosts();
}

function updateUsersLabel(value) {
  const label = document.getElementById('users-val');
  if (label) label.textContent = value;
  calculateCosts();
}

function calculateCosts() {
  // Get inputs
  const fabricSku = document.getElementById('fabric-sku').value;
  const storageGb = parseFloat(document.getElementById('storage-gb').value) || 0;
  const azureSql = document.getElementById('azure-sql').value;
  const devopsUsers = parseInt(document.getElementById('devops-users').value) || 0;

  // Perform Calculations
  const fabricComputeCost = FABRIC_SKU_PRICES[fabricSku] || 0;
  const oneLakeStorageCost = storageGb * ONELAKE_PRICE_PER_GB;
  const azureSqlCost = AZURE_SQL_PRICES[azureSql] || 0;
  
  // First 5 users are free in DevOps
  const paidDevOpsUsers = Math.max(0, devopsUsers - 5);
  const devopsCost = paidDevOpsUsers * DEVOPS_PRICE_PER_USER;

  const totalCost = fabricComputeCost + oneLakeStorageCost + azureSqlCost + devopsCost;

  // Update Breakdown Labels
  document.getElementById('breakdown-fabric-compute').textContent = `$${fabricComputeCost.toFixed(2)}`;
  document.getElementById('breakdown-onelake-storage').textContent = `$${oneLakeStorageCost.toFixed(2)}`;
  document.getElementById('breakdown-azure-sql').textContent = `$${azureSqlCost.toFixed(2)}`;
  document.getElementById('breakdown-devops').textContent = `$${devopsCost.toFixed(2)}`;

  // Update Total with counter animation
  animateCounter('total-cost-val', totalCost);
}

// Smooth number counter animation
function animateCounter(elementId, targetValue) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const startValue = parseFloat(el.textContent.replace(',', '')) || 0;
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
