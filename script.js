// ============================================================
//  METABOLIC MAZE - SIMULATION ENGINE
//  Integrated Principles of Animal Anatomy & Physiology
// ============================================================

// ---- DRAG & DROP HANDLERS ----
function allowDrop(ev) {
    ev.preventDefault();
    var dz = ev.target.closest ? ev.target.closest('.dropzone') : ev.target;
    if (dz) dz.classList.add('dragover');
}
function removeDragOver(ev) {
    var dz = ev.target.closest ? ev.target.closest('.dropzone') : ev.target;
    if (dz) dz.classList.remove('dragover');
}
function drag(ev) {
    ev.dataTransfer.setData('text', ev.target.id);
}

// global error trapping
window.addEventListener('error', function(e) {
    console.error('Global error:', e.message, e.error);
    var dbg = document.getElementById('debug-output');
    if (dbg) dbg.textContent += e.message + '\n';
});

// ============================================================
//  APPLICATION-WIDE STATE (persisted via localStorage)
// ============================================================
var intakeAccepted    = 0;
var intakeJammed      = 0;
var fatCount          = 0;
var waterCount        = 0;
var lymphCount        = 0;
var capillaryCount    = 0;
var energyTotal       = 0;
var pillarRemovedFlag = false;
var pHState           = { acid:false, inhibitor:false, buffer:false, protein:false };
var acidCount         = 0;
var bufferCount       = 0;
var inhibitorCount    = 0;
var proteinCount      = 0;
var floraPresent      = true;
var completedStations = [];
var adaptorState      = {
    hawk:    { sparrow:false, hawk:false, crop:false, longtube:false, sharpbeak:false, bilect:false, pancreas:false, cecum:false },
    sparrow: { sparrow:false, hawk:false, crop:false, longtube:false, sharpbeak:false, bilect:false, pancreas:false, cecum:false }
};

// ---- PERSISTENCE ----
function saveState() {
    var state = {
        intakeAccepted: intakeAccepted,
        intakeJammed: intakeJammed,
        fatCount: fatCount,
        waterCount: waterCount,
        lymphCount: lymphCount,
        capillaryCount: capillaryCount,
        energyTotal: energyTotal,
        pillarRemovedFlag: pillarRemovedFlag,
        pHState: pHState,
        acidCount: acidCount,
        bufferCount: bufferCount,
        inhibitorCount: inhibitorCount,
        proteinCount: proteinCount,
        floraPresent: floraPresent,
        adaptorState: adaptorState,
        completedStations: completedStations
    };
    try { localStorage.setItem('demoState', JSON.stringify(state)); } catch(e) { console.warn(e); }
}

function loadState() {
    try {
        var s = localStorage.getItem('demoState');
        if (!s) return;
        var st = JSON.parse(s);
        intakeAccepted    = st.intakeAccepted    || 0;
        intakeJammed      = st.intakeJammed      || 0;
        fatCount          = st.fatCount          || 0;
        waterCount        = st.waterCount        || 0;
        lymphCount        = st.lymphCount        || 0;
        capillaryCount    = st.capillaryCount    || 0;
        energyTotal       = st.energyTotal       || 0;
        pillarRemovedFlag = st.pillarRemovedFlag || false;
        pHState           = st.pHState           || { acid:false, inhibitor:false, buffer:false, protein:false };
        acidCount         = st.acidCount         || 0;
        bufferCount       = st.bufferCount       || 0;
        inhibitorCount    = st.inhibitorCount    || 0;
        proteinCount      = st.proteinCount      || 0;
        floraPresent      = (typeof st.floraPresent === 'boolean') ? st.floraPresent : true;
        
        // Load adaptorState but validate structure
        if (st.adaptorState) {
            adaptorState = st.adaptorState;
            // Ensure both hawk and sparrow have all required properties
            if (!adaptorState.hawk || typeof adaptorState.hawk.sparrow === 'undefined') {
                adaptorState.hawk = { sparrow:false, hawk:false, crop:false, longtube:false, sharpbeak:false, bilect:false, pancreas:false, cecum:false };
            }
            if (!adaptorState.sparrow || typeof adaptorState.sparrow.sparrow === 'undefined') {
                adaptorState.sparrow = { sparrow:false, hawk:false, crop:false, longtube:false, sharpbeak:false, bilect:false, pancreas:false, cecum:false };
            }
        }
        completedStations = st.completedStations || [];
    } catch(e) { console.warn(e); }
}
loadState();

// ============================================================
//  UI RESTORE (called on every DOMContentLoaded)
// ============================================================
function restoreUI() {
    updateIntakeMeter();
    updateVitaminCounters();
    updateDivergenceCounters();
    updateEnergyMeter();
    updateEnergyBar();
    updatePhMeter();
    updatePhScale();
    markActiveNav();
    // Restore Station 7 adaptor displays
    if (document.getElementById('attached-hawk')) updateAdaptorDisplay('hawk');
    if (document.getElementById('attached-sparrow')) updateAdaptorDisplay('sparrow');

    var gate = document.getElementById('energy-gate');
    if (gate) {
        if (energyTotal >= 3) {
            gate.classList.add('open', 'flowing');
            gate.classList.remove('closed', 'paused');
            gate.textContent = 'OPEN - metabolic process running';
        } else {
            gate.classList.add('closed', 'paused');
            gate.classList.remove('open', 'flowing');
            gate.textContent = 'CLOSED - insufficient energy';
        }
    }
    var pillar = document.getElementById('phosphorus-pillar');
    if (pillar && pillarRemovedFlag) pillar.classList.add('removed');
}
window.addEventListener('DOMContentLoaded', restoreUI);

// ---- ACTIVE NAV ----
function markActiveNav() {
    var page = location.pathname.split('/').pop() || 'index.html';
    if (page === '') page = 'index.html';
    document.querySelectorAll('nav a').forEach(function(a) {
        var href = a.getAttribute('href');
        if (href === page) a.classList.add('active');
    });
}

// ============================================================
//  QUIZ SYSTEM
// ============================================================
function checkAnswer(btn, isCorrect, explanation) {
    var question = btn.closest('.quiz-question');
    if (!question) return;
    if (question.dataset.answered) return;
    question.dataset.answered = '1';
    btn.classList.add(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) {
        var correct = question.querySelectorAll('.quiz-option[data-correct="true"]');
        correct.forEach(function(o) { o.classList.add('correct'); });
    }
    var fb = question.querySelector('.quiz-feedback');
    if (fb) { fb.textContent = explanation; fb.classList.add('visible'); }
}

// ============================================================
//  STATION 1 - INTAKE
// ============================================================
function updateIntakeMeter() {
    var meter = document.getElementById('intake-meter');
    if (meter) meter.textContent = 'Accepted: ' + intakeAccepted + '  |  Jammed: ' + intakeJammed;
    saveState();
}
function resetIntake() {
    intakeAccepted = 0; intakeJammed = 0;
    updateIntakeMeter();
    var meter = document.getElementById('intake-meter');
    if (meter) meter.classList.remove('highlight');
    showResult('intake-result', '<span class="bio-label">Station Reset</span><p>Counters cleared. Try dragging different food items.</p>');
    saveState();
}

// ============================================================
//  STATION 2 - VITAMINS
// ============================================================
function updateVitaminCounters() {
    var storage = document.getElementById('storage-counter');
    var waste   = document.getElementById('waste-counter');
    if (storage) storage.textContent = 'Fat-Soluble Stored: ' + fatCount;
    if (waste)   waste.textContent   = 'Water-Soluble Excreted: ' + waterCount;
    saveState();
}
function resetVitamin() {
    fatCount = 0; waterCount = 0;
    updateVitaminCounters();
    var s = document.getElementById('storage-counter');
    var w = document.getElementById('waste-counter');
    if (s) s.classList.remove('highlight');
    if (w) w.classList.remove('highlight');
    showResult('vitamin-result', '<span class="bio-label">Station Reset</span><p>Counters cleared.</p>');
    saveState();
}

// ============================================================
//  STATION 5 - DIVERGENCE
// ============================================================
function updateDivergenceCounters() {
    var l = document.getElementById('lymph-counter');
    var c = document.getElementById('capillary-counter');
    if (l) l.textContent = 'Lymph/Lacteal: ' + lymphCount;
    if (c) c.textContent = 'Blood Capillary: ' + capillaryCount;
    saveState();
}
function resetDivergence() {
    lymphCount = 0; capillaryCount = 0;
    updateDivergenceCounters();
    var l = document.getElementById('lymph-counter');
    var c = document.getElementById('capillary-counter');
    if (l) l.classList.remove('highlight');
    if (c) c.classList.remove('highlight');
    showResult('divergence-result', '<span class="bio-label">Station Reset</span><p>Counters cleared.</p>');
    saveState();
}

// ============================================================
//  STATION 6 - MICROBIOME
// ============================================================
function resetMicrobiome() {
    var flow = document.getElementById('flow-indicator');
    if (flow) { flow.className = 'flow slow'; flow.textContent = 'Water absorption: Normal - healthy flora intact'; }
    updateMicrobiomeBars(100);
    showResult('microbiome-result', '<span class="bio-label">Station Reset</span><p>Flora restored to baseline. Water flow normal.</p>');
}

// ============================================================
//  STATION 7 - ADAPTOR
// ============================================================
function resetAdaptor() {
    adaptorState = {
        hawk:    { sparrow:false, hawk:false, crop:false, longtube:false, sharpbeak:false, bilect:false, pancreas:false, cecum:false },
        sparrow: { sparrow:false, hawk:false, crop:false, longtube:false, sharpbeak:false, bilect:false, pancreas:false, cecum:false }
    };
    // clear attached-module displays
    ['hawk','sparrow'].forEach(function(s) {
        var d = document.getElementById('attached-' + s);
        if (d) d.innerHTML = '<em>No modules attached yet.</em>';
    });
    showResult('adaptor-result', '<span class="bio-label">Station Reset</span><p>All module configurations cleared.</p>');
    saveState();
}

// ============================================================
//  DROP HANDLERS
// ============================================================
function dropIntake(ev) {
    ev.preventDefault();
    var dz = ev.target.closest ? ev.target.closest('.dropzone') : null;
    if (dz) dz.classList.remove('dragover');
    var id   = ev.dataTransfer.getData('text');
    var el   = document.getElementById(id);
    var type = el ? el.getAttribute('data-type') : '';
    intakeChoice(id);
    animateIntake(type === 'herbivore');
    if (type === 'herbivore') intakeAccepted++;
    else if (type === 'carnivore') intakeJammed++;
    updateIntakeMeter();
    var meter = document.getElementById('intake-meter');
    if (meter) { meter.classList.add('highlight'); setTimeout(function() { meter.classList.remove('highlight'); }, 400); }
}

function dropVitamin(ev) {
    ev.preventDefault();
    var dz = ev.target.closest ? ev.target.closest('.dropzone') : null;
    if (dz) dz.classList.remove('dragover');
    var id   = ev.dataTransfer.getData('text');
    var el   = document.getElementById(id);
    var type = el ? el.getAttribute('data-type') : '';
    vitaminChoice(id);
    if (type === 'fat') fatCount++;
    else if (type === 'water') waterCount++;
    updateVitaminCounters();
    var cntId = (type === 'fat') ? 'storage-counter' : (type === 'water') ? 'waste-counter' : null;
    if (cntId) {
        var el2 = document.getElementById(cntId);
        if (el2) { el2.classList.add('highlight'); setTimeout(function() { el2.classList.remove('highlight'); }, 500); }
    }
}

function dropEnergy(ev) {
    ev.preventDefault();
    var dz = ev.target.closest ? ev.target.closest('.dropzone') : null;
    if (dz) dz.classList.remove('dragover');
    var id  = ev.dataTransfer.getData('text');
    var el  = document.getElementById(id);
    var val = el ? parseInt(el.getAttribute('data-value')) : 0;
    energyGate(val);
}

function dropDivergence(ev) {
    ev.preventDefault();
    var dz = ev.target.closest ? ev.target.closest('.dropzone') : null;
    if (dz) dz.classList.remove('dragover');
    var id   = ev.dataTransfer.getData('text');
    var el   = document.getElementById(id);
    var type = el ? el.getAttribute('data-type') : '';
    divergenceChoice(id);
    if (type === 'lipid') lymphCount++;
    else if (type === 'protein' || type === 'carb') capillaryCount++;
    updateDivergenceCounters();
    var cntEl = (type === 'lipid') ? document.getElementById('lymph-counter') : document.getElementById('capillary-counter');
    if (cntEl) { cntEl.classList.add('highlight'); setTimeout(function() { cntEl.classList.remove('highlight'); }, 400); }
}

function dropFlora(ev) {
    ev.preventDefault();
    var dz = ev.target.closest ? ev.target.closest('.dropzone') : null;
    if (dz) dz.classList.remove('dragover');
    var id     = ev.dataTransfer.getData('text');
    var el     = document.getElementById(id);
    var action = el ? el.getAttribute('data-action') : '';
    floraEffect(action);
}

function floraEffect(action) {
    var flow    = document.getElementById('flow-indicator');
    var content = '';
    switch (action) {
        case 'remove':
            content = '<span class="bio-label">ANTIBIOTIC APPLIED - Flora Eliminated</span>'
                + '<p><strong>Result:</strong> Gut flora eliminated. Without bacterial colonization, the large intestine loses its capacity to regulate transit time.</p>'
                + '<p><strong>Physiology:</strong> Normally, gut bacteria ferment undigested fibers and slow luminal flow, allowing water and electrolytes to be reabsorbed through the colonocytes. Without them, <span class="term">osmotic imbalance</span> drives rapid water loss - simulating antibiotic-associated diarrhea.</p>';
            if (flow) { flow.className = 'flow fast'; flow.textContent = 'Water flow: RAPID - diarrhea risk'; }
            updateMicrobiomeBars(10);
            break;
        case 'restore':
            content = '<span class="bio-label">FLORA RESTORED - Normal Absorption Resumes</span>'
                + '<p><strong>Result:</strong> Bacterial community re-established. Normal colonic function returns.</p>'
                + '<p><strong>Physiology:</strong> <span class="term">Commensal bacteria</span> (e.g., Lactobacillus, Bifidobacterium) re-colonize. They produce <span class="term">short-chain fatty acids (SCFAs)</span> that fuel colonocytes and stimulate sodium/water co-transport channels.</p>';
            if (flow) { flow.className = 'flow slow'; flow.textContent = 'Water absorption: Normal - healthy flora intact'; }
            updateMicrobiomeBars(100);
            break;
        case 'probiotic':
            content = '<span class="bio-label">PROBIOTIC ADDED - Beneficial Bacteria Supplemented</span>'
                + '<p><strong>Result:</strong> Beneficial bacterial strains supplemented directly.</p>'
                + '<p><strong>Physiology:</strong> Probiotics temporarily increase microbial diversity. They compete with pathogens through <span class="term">competitive exclusion</span> and produce bacteriocins that inhibit harmful species.</p>';
            if (flow) { flow.className = 'flow slow'; flow.textContent = 'Water absorption: Slightly improved by probiotic colonization'; }
            updateMicrobiomeBars(75);
            break;
        case 'pathogen':
            content = '<span class="bio-label">PATHOGEN INTRODUCED - Inflammatory Response</span>'
                + '<p><strong>Result:</strong> Colonization by pathogenic organism triggers immune response.</p>'
                + '<p><strong>Physiology:</strong> <span class="term">Enterotoxins</span> secreted by pathogens (e.g., Clostridium difficile) activate chloride channels, causing secretory diarrhea. The epithelial tight junctions break down, increasing intestinal permeability (<span class="term">leaky gut</span>).</p>';
            if (flow) { flow.className = 'flow fast'; flow.textContent = 'Water flow: ERRATIC - inflammatory response'; }
            updateMicrobiomeBars(30);
            break;
        case 'prebiotic':
            content = '<span class="bio-label">PREBIOTIC FIBER ADDED - Selective Microbiome Feeding</span>'
                + '<p><strong>Result:</strong> Selective substrate feeds beneficial bacterial populations.</p>'
                + '<p><strong>Physiology:</strong> <span class="term">Inulin and FOS</span> (fructooligosaccharides) resist enzymatic digestion in the small intestine and reach the colon intact, where they are fermented by Bifidobacterium and Lactobacillus. This selectively stimulates SCFA production.</p>';
            if (flow) { flow.className = 'flow slow'; flow.textContent = 'Water absorption: Stable - prebiotic feeding microbiome'; }
            updateMicrobiomeBars(90);
            break;
        default:
            content = '<p>No change detected.</p>';
    }
    showResult('microbiome-result', content);
}

function updateMicrobiomeBars(pct) {
    var bars = document.querySelectorAll('.micro-bar');
    var heights = [pct * 0.9, pct, pct * 0.7, pct * 0.85, pct * 0.6, pct * 0.95];
    bars.forEach(function(b, i) {
        b.style.height = Math.max(4, heights[i] * 0.7) + 'px';
        b.classList.toggle('depleted', pct < 40);
    });
}

// ============================================================
//  STATION 7 - ADAPTOR DROPS
// ============================================================
function dropAdaptor(ev) {
    ev.preventDefault();
    // ALWAYS use currentTarget - it is the element with the ondrop attribute, never a child element
    var zoneId = ev.currentTarget ? ev.currentTarget.id : '';
    var dz     = document.getElementById(zoneId);
    if (dz) dz.classList.remove('dragover');
    var id     = ev.dataTransfer.getData('text');
    var el     = document.getElementById(id);
    var action = el ? el.getAttribute('data-action') : '';
    var side   = zoneId.indexOf('hawk') !== -1 ? 'hawk' : zoneId.indexOf('sparrow') !== -1 ? 'sparrow' : null;
    if (!side) return;
    
    // Ensure adaptorState[side] exists with all required properties
    if (!adaptorState[side]) {
        adaptorState[side] = { sparrow:false, hawk:false, crop:false, longtube:false, sharpbeak:false, bilect:false, pancreas:false, cecum:false };
    }
    
    // Set the state
    if (action && adaptorState[side]) {
        adaptorState[side][action] = true;
    }
    
    // Then handle based on action
    switch (action) {
        case 'sparrow':   setConfig(side, 'sparrow');   break;
        case 'hawk':      setConfig(side, 'hawk');      break;
        case 'crop':      setConfig(side, 'crop');      break;
        case 'longtube':  setConfig(side, 'longtube');  break;
        case 'sharpbeak': setConfig(side, 'sharpbeak'); break;
        case 'bilect':    setConfig(side, 'bilect');    break;
        case 'pancreas':  setConfig(side, 'pancreas');  break;
        case 'cecum':     setConfig(side, 'cecum');     break;
        case 'wrong':     showAdaptorResult(side, '<span class="bio-label">INCOMPATIBLE MODULE</span><p>This module cannot attach to the current configuration. Check that the module matches the intended bird type.</p>'); break;
        default: showAdaptorResult(side, '<span class="bio-label">UNKNOWN MODULE</span><p>This module is not recognized by the system.</p>');
    }
    saveState();
    updateAdaptorDisplay(side);
}

function dropTestFood(ev) {
    ev.preventDefault();
    try {
        // ALWAYS use currentTarget for reliable zone identification
        var zoneId = ev.currentTarget ? ev.currentTarget.id : '';
        var dz     = document.getElementById(zoneId);
        if (dz) dz.classList.remove('dragover');
        var id   = ev.dataTransfer.getData('text');
        var el   = document.getElementById(id);
        var food = el ? el.textContent.trim().toLowerCase() : '';
        var side = zoneId.indexOf('hawk') !== -1 ? 'hawk' : zoneId.indexOf('sparrow') !== -1 ? 'sparrow' : null;
        if (!side) return;
        
        // Ensure adaptorState[side] exists
        if (!adaptorState[side]) {
            adaptorState[side] = { sparrow:false, hawk:false, crop:false, longtube:false, sharpbeak:false, bilect:false, pancreas:false, cecum:false };
        }
        var st  = adaptorState[side];
        if (!st) return;
        var msg = '';
        var anyModule = st.hawk || st.sparrow || st.crop || st.longtube || st.sharpbeak || st.bilect || st.pancreas || st.cecum;

        if (!anyModule) {
            msg = '<span class="bio-label">NO MODULES ATTACHED</span>'
                + '<p>You need to attach at least one digestive module before testing food. Drag a module from the bank above into the adapter zone, then drop a food item here.</p>';
        }
        // --- CARNIVORE SUCCESSES ---
        else if ((st.hawk || st.sharpbeak) && (food.indexOf('meat') !== -1 || food.indexOf('flesh') !== -1)) {
            msg = '<span class="bio-label">SUCCESS - Carnivore Processes Meat</span>'
                + '<p>The short GI tract rapidly processes high-protein meat. The proventriculus HCl and proteases denature muscle proteins efficiently. Low-fiber content means minimal fermentation time is needed.</p>';
        } else if ((st.hawk || st.sharpbeak) && (food.indexOf('fish') !== -1)) {
            msg = '<span class="bio-label">SUCCESS - Carnivore Processes Fish</span>'
                + '<p>Fish protein is rich in omega-3 fatty acids and easily hydrolyzed by pancreatic lipase and proteases. The hawk configuration handles this food source efficiently.</p>';
        } else if ((st.hawk || st.sharpbeak) && (food.indexOf('worm') !== -1 || food.indexOf('insect') !== -1)) {
            msg = '<span class="bio-label">PARTIAL SUCCESS - Carnivore Handles Invertebrates</span>'
                + '<p>Soft-bodied invertebrates like worms are easily digested in the acidic proventriculus. Insects have chitin exoskeletons which require chitinase. Raptors have limited chitinase but can process small amounts.</p>';
        } else if ((st.hawk || st.sharpbeak) && (food.indexOf('carrion') !== -1 || food.indexOf('rodent') !== -1 || food.indexOf('mammal') !== -1)) {
            msg = '<span class="bio-label">SUCCESS - Raptor Processes Prey/Carrion</span>'
                + '<p>Raptors are well adapted to carrion and small mammal prey. High stomach acidity (pH ~1.5) kills most bacteria in carrion. The muscular proventriculus begins protein denaturation immediately.</p>';
        }
        // --- GRANIVORE SUCCESSES ---
        else if (st.sparrow && (food.indexOf('seed') !== -1 || food.indexOf('grain') !== -1)) {
            msg = '<span class="bio-label">SUCCESS - Gizzard Grinds Seeds/Grain</span>'
                + '<p>Seeds travel from the crop through the proventriculus into the muscular gizzard. Gastroliths (grit) and rhythmic contractions at up to 200N force pulverize the hard seed coat, releasing the starchy endosperm for amylase digestion.</p>';
        } else if (st.crop && (food.indexOf('seed') !== -1 || food.indexOf('grain') !== -1 || food.indexOf('berry') !== -1)) {
            msg = '<span class="bio-label">SUCCESS - Crop Stores and Softens Food</span>'
                + '<p>The crop (ingluvies) temporarily stores seeds/berries and softens them with moisture and enzymes. This pre-digestion step reduces the workload on the gizzard and proventriculus. The crop enables rapid ingestion during exposed feeding.</p>';
        } else if (st.longtube && (food.indexOf('grass') !== -1 || food.indexOf('plant') !== -1 || food.indexOf('fiber') !== -1 || food.indexOf('leaf') !== -1)) {
            msg = '<span class="bio-label">SUCCESS - Extended Intestine Processes Plant Matter</span>'
                + '<p>The elongated intestinal loop dramatically increases surface area and transit time. Symbiotic bacteria in the cecal extensions ferment cellulose into absorbable SCFAs. Without this extended tube, plant fiber passes largely undigested.</p>';
        } else if (st.bilect && (food.indexOf('fat') !== -1 || food.indexOf('oil') !== -1 || food.indexOf('lipid') !== -1)) {
            msg = '<span class="bio-label">SUCCESS - Bile Duct Emulsifies Fats</span>'
                + '<p>The bile duct module secretes bile salts into the duodenum, emulsifying dietary fats into tiny micelles. This dramatically increases surface area for pancreatic lipase activity, enabling efficient fat digestion.</p>';
        } else if (st.pancreas && (food.indexOf('starch') !== -1 || food.indexOf('grain') !== -1 || food.indexOf('carb') !== -1)) {
            msg = '<span class="bio-label">SUCCESS - Pancreatic Module Digests Starch</span>'
                + '<p>The pancreatic module secretes amylase into the small intestine, breaking down complex starches into maltose and glucose. CCK signaling from the duodenum triggers enzyme release in response to food arrival.</p>';
        } else if (st.cecum && (food.indexOf('fiber') !== -1 || food.indexOf('plant') !== -1 || food.indexOf('grass') !== -1)) {
            msg = '<span class="bio-label">SUCCESS - Cecal Extension Ferments Fiber</span>'
                + '<p>The cecal extensions harbor fermentative bacteria that break down dietary fiber into short-chain fatty acids. This significantly expands the range of plant material that can be utilized as energy sources.</p>';
        }
        // --- MISMATCHES (interesting failure cases) ---
        else if ((st.hawk || st.sharpbeak) && (food.indexOf('seed') !== -1 || food.indexOf('grain') !== -1)) {
            msg = '<span class="bio-label">MISMATCH - Raptor Cannot Process Seeds Efficiently</span>'
                + '<p>Without a muscular gizzard and gastroliths, hard seeds pass through largely intact. The acidic proventriculus can partially dissolve the seed coat, but most starch remains locked inside. This is poor nutritional yield for the energy spent finding seeds.</p>';
        } else if (st.sparrow && (food.indexOf('meat') !== -1 || food.indexOf('carrion') !== -1)) {
            msg = '<span class="bio-label">MISMATCH - Granivore Not Adapted for Meat</span>'
                + '<p>While some sparrows do eat insects opportunistically, the granivore GI configuration has lower gastric acidity and slower transit, leading to inefficient protein denaturation and potential bacterial overgrowth from putrefying animal tissue.</p>';
        } else {
            msg = '<span class="bio-label">MISMATCH - No Compatible Module Attached</span>'
                + '<p>The current module configuration cannot process this food type. Try attaching a module that matches the food: Gizzard Module for seeds/grain, Short Tube for meat/fish, Extended Intestine for plant matter, Crop for soft foods.</p>';
        }

        var resEl = document.getElementById('test-result-' + side);
        if (resEl) { resEl.innerHTML = msg; resEl.classList.add('show'); resEl.classList.remove('pop'); void resEl.offsetWidth; resEl.classList.add('pop'); setTimeout(function() { resEl.classList.remove('pop'); }, 400); }
    } catch(e) {
        // Silent fail
    }
}

function updateAdaptorDisplay(side) {
    var d = document.getElementById('attached-' + side);
    if (!d) return;
    var st = adaptorState[side];
    var names = { sparrow:'Gizzard Module', hawk:'Short Tube (Hawk GI)', crop:'Crop Chamber', longtube:'Extended Intestine', sharpbeak:'Sharp Beak', bilect:'Bile Duct Module', pancreas:'Pancreatic Module', cecum:'Cecal Extension' };
    var attached = [];
    Object.keys(st).forEach(function(k) { if (st[k]) attached.push('<span style="background:#d1fadf;color:#166534;padding:.15rem .45rem;border-radius:4px;font-size:.8rem;border:1px solid #6ee7a0;">' + (names[k] || k) + '</span>'); });
    d.innerHTML = attached.length ? attached.join(' ') : '<em style="color:#94a3b8;font-size:.83rem;">No modules attached yet - drag modules above into the zone.</em>';
    d.classList.add('show');
}

// ============================================================
//  SHOW RESULT
// ============================================================
function showResult(elementId, content) {
    var result = document.getElementById(elementId);
    if (!result) return;
    result.innerHTML = content;
    result.classList.add('show');
    result.classList.remove('pop');
    // Force reflow to restart animation
    void result.offsetWidth;
    result.classList.add('pop');
    setTimeout(function() { result.classList.remove('pop'); }, 420);
}

// ============================================================
//  INTAKE ANIMATION (Station 1)
// ============================================================
function animateIntake(isHerbivore) {
    var path = document.getElementById('intake-path');
    if (!path) return;
    var marker = document.createElement('div');
    marker.className = 'intake-marker ' + (isHerbivore ? 'accepted' : 'rejected');
    path.appendChild(marker);
    requestAnimationFrame(function() {
        marker.classList.add(isHerbivore ? 'slide-down' : 'slide-up');
    });
    marker.addEventListener('animationend', function() { marker.remove(); });
}

// ============================================================
//  INTAKE CHOICE (Station 1)
// ============================================================
function intakeChoice(id) {
    var zone    = document.getElementById('intake-zone');
    var content = '';
    switch (id) {
        case 'item-nut':
            content = '<span class="bio-label">ACCEPTED - Nut/Seed (Herbivore Compatible)</span>'
                + '<p>Hard outer coat cracked by flat <span class="term">molariform teeth</span>. The lipid and protein core is released and passed to the stomach. Herbivore dentition is specifically adapted to crush hard plant material via lateral grinding motion.</p>';
            break;
        case 'item-leaf':
            content = '<span class="bio-label">ACCEPTED - Leaf (Herbivore Compatible)</span>'
                + '<p>Cell walls composed of <span class="term">cellulose</span> are partially broken by flat teeth and extensive mastication. Salivary amylase begins starch hydrolysis. Fermentable by hindgut flora. High water content aids transit.</p>';
            break;
        case 'item-berry':
            content = '<span class="bio-label">ACCEPTED - Berry (Herbivore Compatible)</span>'
                + '<p>Simple sugars (fructose, glucose) are absorbed rapidly via GLUT transporters. Anthocyanin pigments pass largely intact. The soft texture requires minimal dental work - passes quickly through the esophagus via peristalsis.</p>';
            break;
        case 'item-twig':
            content = '<span class="bio-label">MARGINAL - Twig (Lignin-Rich)</span>'
                + '<p><span class="term">Lignin</span>-rich woody material is too resistant for most herbivore dentition beyond specialized browsers (e.g., moose, giraffe). Slows passage; may cause partial obstruction in smaller species without specialized fermentation chambers.</p>';
            if (zone) { zone.classList.add('jam'); setTimeout(function() { zone.classList.remove('jam'); }, 500); }
            break;
        case 'item-grass':
            content = '<span class="bio-label">ACCEPTED - Grass (Herbivore Compatible)</span>'
                + '<p>High <span class="term">silica</span> content gradually wears teeth (requiring hypsodonty - high-crowned molars). In ruminants, grass is regurgitated and re-chewed (<span class="term">rumination</span>). Non-ruminants rely on hindgut fermentation chambers.</p>';
            break;
        case 'item-insect':
            content = '<span class="bio-label">REJECTED - Insect (Chitin Exoskeleton)</span>'
                + '<p><span class="term">Chitin</span> (poly-N-acetylglucosamine) cannot be digested by the herbivore enzyme profile, which lacks chitinase. Herbivores also lack the highly acidic gastric environment (pH 1.5-2.5) needed to denature insect proteins. Funnel jammed.</p>';
            if (zone) { zone.classList.add('jam'); setTimeout(function() { zone.classList.remove('jam'); }, 500); }
            break;
        case 'item-eggshell':
            content = '<span class="bio-label">REJECTED - Eggshell (CaCO3)</span>'
                + '<p>Calcium carbonate shell material has no caloric value. It abrades the mucosa and is mechanically incompatible with herbivore dentition, which is designed for lateral grinding of plant material rather than crushing inorganic mineral structures.</p>';
            if (zone) { zone.classList.add('jam'); setTimeout(function() { zone.classList.remove('jam'); }, 500); }
            break;
        case 'item-meat':
            content = '<span class="bio-label">CRITICAL JAM - Meat (Animal Tissue)</span>'
                + '<p>Animal muscle tissue requires <span class="term">acidic gastric pH (1.5-3.5)</span>, pepsin for initial denaturation, plus extensive pancreatic protease activity. Herbivore gastric pH is typically 3.5-4.5, and their intestinal flora is not adapted to process significant amounts of animal tissue. Complete jam.</p>';
            if (zone) { zone.classList.add('jam'); setTimeout(function() { zone.classList.remove('jam'); }, 500); }
            break;
        case 'item-water':
            content = '<span class="bio-label">NEUTRAL - Water</span>'
                + '<p>Water passes freely through any digestive system. Absorbed primarily in the large intestine and, to a lesser extent, the small intestine via <span class="term">osmosis</span> driven by sodium co-transport (SGLT1 and Na+/K+-ATPase).</p>';
            break;
        case 'item-rock':
            content = '<span class="bio-label">REJECTED - Rock/Grit (Inorganic)</span>'
                + '<p>Inorganic mineral with no nutritional value. Some granivorous birds deliberately ingest grit into their gizzard for mechanical grinding. In a mammalian herbivore funnel context, the rock is rejected. Models foreign body incompatibility.</p>';
            if (zone) { zone.classList.add('jam'); setTimeout(function() { zone.classList.remove('jam'); }, 500); }
            break;
        default:
            content = '<span class="bio-label">UNKNOWN MATERIAL</span><p>Unrecognized input - system ejects via mucosal reflexes.</p>';
    }
    showResult('intake-result', content);
}

// ============================================================
//  VITAMIN CHOICE (Station 2)
// ============================================================
function vitaminChoice(id) {
    var content = '';
    switch (id) {
        case 'vit-b':
            content = '<span class="bio-label">WATER-SOLUBLE - Vitamin B Complex - Excreted</span>'
                + '<p>The B vitamins (B1 thiamine, B2 riboflavin, B3 niacin, B6, B12, folate, biotin) dissolve in the aqueous intestinal lumen. Absorbed by specific carrier proteins in the <span class="term">jejunum</span>, but excess is rapidly filtered by the kidneys.</p>'
                + '<p><strong>Clinical note:</strong> Deficiency develops quickly if dietary intake stops, making daily consumption essential. B12 deficiency causes megaloblastic anemia.</p>';
            break;
        case 'vit-c':
            content = '<span class="bio-label">WATER-SOLUBLE - Vitamin C (Ascorbic Acid) - Excreted</span>'
                + '<p>Ascorbic acid is a potent <span class="term">antioxidant</span> and cofactor for collagen hydroxylation (prolyl and lysyl hydroxylases). Cannot be stored - once plasma is saturated (~70 micromol/L), excess is excreted in urine.</p>'
                + '<p><strong>Clinical note:</strong> Deficiency causes <span class="term">scurvy</span> - collagen degradation, bleeding gums, perifollicular hemorrhage.</p>';
            break;
        case 'vit-d':
            content = '<span class="bio-label">FAT-SOLUBLE - Vitamin D (Calciferol) - Stored in Adipose</span>'
                + '<p>Absorbed with dietary fat via <span class="term">chylomicrons</span> into the lymphatic system. Stored in adipose tissue and liver. Requires hepatic 25-hydroxylation then renal 1-alpha-hydroxylation to become active <span class="term">calcitriol</span>, regulating intestinal calcium absorption.</p>'
                + '<p><strong>Toxicity risk:</strong> Excess accumulates and can cause hypercalcemia, renal calcification.</p>';
            break;
        case 'vit-a':
            content = '<span class="bio-label">FAT-SOLUBLE - Vitamin A (Retinol) - Stored in Liver</span>'
                + '<p>Retinol and its precursor beta-carotene are absorbed via fat pathways (micelles + chylomicrons). The liver stores >90% of body Vitamin A as <span class="term">retinyl esters</span>. Essential for rhodopsin synthesis (night vision), epithelial differentiation, and T-cell immune function.</p>'
                + '<p><strong>Toxicity risk:</strong> Hypervitaminosis A causes liver damage, intracranial hypertension, teratogenicity.</p>';
            break;
        case 'vit-k':
            content = '<span class="bio-label">FAT-SOLUBLE - Vitamin K (Phylloquinone) - Stored in Liver</span>'
                + '<p>Essential cofactor for <span class="term">gamma-carboxylation</span> of clotting factors II (prothrombin), VII, IX, and X by the enzyme GGCX. Absorbed with fat in the proximal small intestine. Some K2 (menaquinone) is synthesized by gut flora.</p>'
                + '<p><strong>Clinical note:</strong> Warfarin acts by blocking Vitamin K epoxide reductase, preventing coagulation factor activation.</p>';
            break;
        case 'vit-zinc':
            content = '<span class="bio-label">MINERAL - Zinc (Different Transport Pathway)</span>'
                + '<p>Zinc is a trace mineral, not a vitamin. Absorbed via <span class="term">ZIP transporters</span> (ZIP4/ZnT5) in the duodenum and bound to metallothionein. Cofactor for over 300 enzymes including carbonic anhydrase, DNA polymerase, and Cu/Zn-SOD. It bypasses the solubility vitamin filter.</p>';
            break;
        case 'vit-stone':
            content = '<span class="bio-label">REJECTED - Inorganic Stone</span>'
                + '<p>No nutritional value. Inorganic mineral composite with no enzymatic solubility. Rejected by the solubility filter. Clinically analogous to a bezoar - a foreign body that cannot be chemically processed by the digestive system.</p>';
            break;
        default:
            content = '<span class="bio-label">UNKNOWN TOKEN</span><p>Unrecognized substance - no pathway match found.</p>';
    }
    showResult('vitamin-result', content);
}

// ============================================================
//  ENERGY GATE (Station 3)
// ============================================================
function updateEnergyMeter() {
    var meter = document.getElementById('energy-meter');
    if (meter) meter.textContent = 'Energy Volume: ' + energyTotal + ' / 3 units required';
    saveState();
}

function updateEnergyBar() {
    var bar = document.getElementById('energy-bar');
    if (!bar) return;
    var pct = Math.min(100, Math.max(0, (energyTotal / 3) * 100));
    bar.style.width = pct + '%';
    bar.setAttribute('data-value', energyTotal + '/3');
    if (energyTotal >= 3) {
        bar.style.background = 'linear-gradient(90deg, #27ae60, #2ecc71)';
    } else if (energyTotal > 0) {
        bar.style.background = 'linear-gradient(90deg, #e67e22, #f39c12)';
    } else {
        bar.style.background = 'linear-gradient(90deg, #c0392b, #e74c3c)';
    }
}

function removePhosphorus() {
    var pillar = document.getElementById('phosphorus-pillar');
    pillarRemovedFlag = true;
    if (pillar) pillar.classList.add('removed');
    var content = '<span class="bio-label">PHOSPHORUS PILLAR REMOVED - Structural Failure</span>'
        + '<p>Phosphorus contributes to <span class="term">hydroxyapatite</span> [Ca5(PO4)3OH], the mineral phase of bone and teeth. It represents approximately 1% of total body weight, with 85% in the skeleton and 14% in soft tissues.</p>'
        + '<p>When serum phosphate falls below 0.8 mmol/L (<span class="term">hypophosphatemia</span>), bone mineralization fails. This causes <span class="term">osteomalacia</span> in adults and rickets in children - the structural collapse visible here models the loss of tensile strength in demineralized bone matrix (osteoid).</p>';
    showResult('stress-result', content);
    saveState();
}

function energyGate(volume) {
    energyTotal += volume;
    if (energyTotal < 0) energyTotal = 0;
    updateEnergyMeter();
    updateEnergyBar();
    var em = document.getElementById('energy-meter');
    if (em) { em.classList.add('highlight'); setTimeout(function() { em.classList.remove('highlight'); }, 350); }
    var threshold = 3;
    var gate      = document.getElementById('energy-gate');
    var content   = '';
    if (energyTotal >= threshold) {
        content = '<span class="bio-label">ENERGY THRESHOLD REACHED - Gate Opens</span>'
            + '<p>Accumulated metabolic fuel (' + energyTotal + ' units) exceeds the minimum activation threshold. ATP-dependent transport processes initiate.</p>'
            + '<p><strong>Physiology:</strong> The <span class="term">basal metabolic rate (BMR)</span> requires a minimum energy supply to maintain active ion pumps, enzyme secretion, and intestinal peristalsis. Below threshold, catabolism of muscle proteins (gluconeogenesis) begins.</p>';
        if (gate) {
            gate.classList.remove('closed', 'paused');
            gate.classList.add('open', 'flowing');
            gate.textContent = 'OPEN - metabolic process running';
        }
    } else if (energyTotal <= 0) {
        energyTotal = 0;
        content = '<span class="bio-label">ENERGY DEPLETED - Starvation State</span>'
            + '<p>No caloric reserves available. The body activates <span class="term">gluconeogenesis</span> from amino acids (alanine cycle), then <span class="term">ketogenesis</span> from fatty acid beta-oxidation as survival mechanisms. Gate remains closed.</p>';
        if (gate) { gate.classList.remove('open', 'flowing'); gate.classList.add('closed', 'paused'); gate.textContent = 'CLOSED - insufficient energy'; }
    } else {
        var needed = threshold - energyTotal;
        content = '<span class="bio-label">PARTIAL ENERGY - Gate Still Closed</span>'
            + '<p>Current volume: <strong>' + energyTotal + '</strong> unit(s). Needs <strong>' + needed + '</strong> more to reach the metabolic activation threshold.</p>'
            + '<p>In real physiology, this models insufficient dietary intake to sustain active intestinal transport, enzyme secretion, and peristalsis. Sub-threshold intake leads to absorption inefficiency.</p>';
        if (gate) { gate.classList.remove('open', 'flowing'); gate.classList.add('closed', 'paused'); gate.textContent = 'CLOSED (' + energyTotal + '/' + threshold + ')'; }
    }
    showResult('stress-result', content);
    saveState();
}

function burnEnergy() {
    if (energyTotal > 0) {
        energyGate(-1);
    } else {
        showResult('stress-result', '<span class="bio-label">NO ENERGY TO BURN</span><p>Stores are empty. The system has entered a catabolic state - protein breakdown (gluconeogenesis) and fat mobilization (lipolysis) are the last resort metabolic pathways.</p>');
    }
}

function testEnergyGate() {
    var content = '<span class="bio-label">ENERGY GATE TEST</span>'
        + '<p>With sufficient food volume (threshold = 3 units), the weighted gate opens. Insufficient volume keeps it closed, halting downstream metabolic processes - simulating undernutrition impact on intestinal function.</p>';
    showResult('stress-result', content);
}

function resetStress() {
    energyTotal = 0;
    pillarRemovedFlag = false;
    updateEnergyMeter();
    updateEnergyBar();
    var gate = document.getElementById('energy-gate');
    if (gate) { gate.classList.remove('open', 'flowing'); gate.classList.add('closed', 'paused'); gate.textContent = 'CLOSED - insufficient energy'; }
    var pillar = document.getElementById('phosphorus-pillar');
    if (pillar) pillar.classList.remove('removed');
    showResult('stress-result', '<span class="bio-label">Station Reset</span><p>Pillar restored; energy cleared to zero.</p>');
    saveState();
}

// ============================================================
//  pH METER & VISUAL SCALE (Station 4)
// ============================================================
function updatePhMeter() {
    var meter = document.getElementById('ph-meter');
    if (meter) meter.textContent = 'Acid: ' + acidCount + '  |  Buffer: ' + bufferCount + '  |  Inhibitor: ' + inhibitorCount + '  |  Protein: ' + proteinCount;
    saveState();
}

function updatePhScale() {
    var arrow = document.getElementById('ph-arrow');
    if (!arrow) return;
    var phLevel = 7;
    phLevel -= acidCount   * 1.8;
    phLevel += bufferCount * 2.2;
    phLevel  = Math.max(0, Math.min(14, phLevel));
    var pct  = (phLevel / 14) * 100;
    arrow.style.left = pct + '%';
    if (phLevel < 4) {
        arrow.style.color = '#dc2626';
    } else if (phLevel < 6) {
        arrow.style.color = '#f97316';
    } else if (phLevel < 8) {
        arrow.style.color = '#16a34a';
    } else {
        arrow.style.color = '#1d4ed8';
    }
    var label = document.getElementById('ph-value-label');
    if (label) label.textContent = 'Estimated pH: ' + phLevel.toFixed(1);
}

function dropPh(ev) {
    ev.preventDefault();
    var dz = ev.target.closest ? ev.target.closest('.dropzone') : null;
    if (dz) dz.classList.remove('dragover');
    var id   = ev.dataTransfer.getData('text');
    var el   = document.getElementById(id);
    var type = el ? el.getAttribute('data-type') : '';
    if (type && pHState.hasOwnProperty(type)) pHState[type] = true;
    switch (type) {
        case 'acid':      acidCount++;      break;
        case 'buffer':    bufferCount++;    break;
        case 'inhibitor': inhibitorCount++; break;
        case 'protein':   proteinCount++;   break;
    }
    updatePhMeter();
    updatePhScale();
    var phm = document.getElementById('ph-meter');
    if (phm) { phm.classList.add('highlight'); setTimeout(function() { phm.classList.remove('highlight'); }, 350); }
    phChoice();
}

function phChoice() {
    var content = '';
    if (pHState.acid && !pHState.buffer && !pHState.inhibitor) {
        content += '<span class="bio-label">HIGHLY ACIDIC - Pepsin Active (pH ~1.5-3.5)</span>'
            + '<p><span class="term">Pepsin</span> is a protease with optimal activity at pH 1.5-2.5. HCl secreted by parietal cells (via H+/K+-ATPase proton pump) denatures tertiary protein structure and converts inactive pepsinogen to active pepsin by autocatalytic cleavage of the activation peptide.</p>';
    }
    if (pHState.buffer) {
        content += '<span class="bio-label">ALKALINE BUFFER ADDED - pH Rising (Pepsin Deactivating)</span>'
            + '<p>The pancreas secretes <span class="term">bicarbonate (HCO3-)</span> into the duodenum in response to secretin released by S-cells in the duodenal mucosa. As pH rises above pH 4, pepsin undergoes irreversible denaturation. This is the fundamental gastric-to-intestinal transition.</p>';
    }
    if (pHState.inhibitor) {
        content += '<span class="bio-label">PEPSIN INHIBITOR PRESENT - Enzyme Blocked</span>'
            + '<p>Pepsin inhibitors block the enzyme active site (aspartate protease mechanism). This models pharmacological acid suppression - PPIs (proton pump inhibitors) like omeprazole block the H+/K+-ATPase, raising gastric pH and indirectly inactivating pepsin.</p>';
    }
    if (pHState.protein) {
        content += '<span class="bio-label">PROTEIN BEAD IN STOMACH - Ready for Digestion</span>'
            + '<p>Protein substrate is in position. Ensure <strong>acid is present</strong> and <strong>no buffer or inhibitor</strong> before triggering the tilt to simulate successful peptic digestion and pyloric release.</p>';
    }
    if (!content) {
        content = '<span class="bio-label">No Items Added Yet</span><p>Drag substances to simulate gastric chemistry. Start with Stomach Acid, then add the Protein bead, and finally trigger the tilt.</p>';
    }
    showResult('ph-result', content);
}

function tiltStomach() {
    var content = '';
    if (pHState.protein) {
        if (pHState.acid && !pHState.buffer && !pHState.inhibitor) {
            content = '<span class="bio-label">TILT SUCCESSFUL - Peptides Released into Duodenum</span>'
                + '<p>Protein has been cleaved by pepsin into <span class="term">peptides and amino acids</span>. The peristaltic tilt moves chyme through the <span class="term">pyloric sphincter</span> into the duodenum.</p>'
                + '<p>The pyloric sphincter opens in response to sufficient acid and protein processing, regulating the rate of gastric emptying. Secretin and CCK are released as the acidic chyme enters the duodenum, triggering pancreatic enzyme secretion.</p>';
        } else if (pHState.buffer) {
            content = '<span class="bio-label">TILT FAILED - pH Neutralized by Buffer</span>'
                + '<p>The alkaline buffer has deactivated pepsin. The protein remains intact. In real physiology, the antrum senses the pH and delays gastric emptying until optimal conditions for duodenal digestion are met.</p>';
        } else if (pHState.inhibitor) {
            content = '<span class="bio-label">TILT FAILED - Enzyme Blocked by Inhibitor</span>'
                + '<p>The pepsin inhibitor prevents proteolytic activity. No peptide fragments are released. This models the clinical mechanism of PPI therapy in GERD (gastroesophageal reflux disease) and peptic ulcer treatment.</p>';
        } else {
            content = '<span class="bio-label">TILT FAILED - No Acid Present</span>'
                + '<p>Pepsinogen cannot be activated to pepsin without hydrochloric acid. The protein bead remains in its native quaternary structure. Add Stomach Acid first to create the required acidic environment.</p>';
        }
    } else {
        content = '<span class="bio-label">NO PROTEIN IN STOMACH</span>'
            + '<p>There is no substrate to digest. Drop a Protein bead into the stomach first, then create the appropriate acid environment before triggering the tilt simulation.</p>';
    }
    showResult('ph-result', content);
}

function resetPh() {
    pHState = { acid:false, inhibitor:false, buffer:false, protein:false };
    acidCount = 0; bufferCount = 0; inhibitorCount = 0; proteinCount = 0;
    updatePhMeter();
    updatePhScale();
    var phm = document.getElementById('ph-meter');
    if (phm) phm.classList.remove('highlight');
    showResult('ph-result', '<span class="bio-label">Station Reset</span><p>All pH conditions cleared. Begin a new gastric chemistry experiment.</p>');
    saveState();
}

// ============================================================
//  DIVERGENCE CHOICE (Station 5)
// ============================================================
function divergenceChoice(id) {
    var content = '';
    switch (id) {
        case 'nut-lipid':
            content = '<span class="bio-label">LYMPH PATHWAY - Lipid via Lacteal/Chylomicron</span>'
                + '<p>After emulsification by bile salts (amphipathic molecules from hepatic cholesterol) and hydrolysis by pancreatic lipase, free fatty acids and 2-monoglycerides are absorbed by enterocytes and reassembled into <span class="term">triglycerides</span>. These are packaged into <span class="term">chylomicrons</span> (apoprotein B-48 coated) and secreted into the central lacteal, entering lymphatics via the thoracic duct.</p>';
            break;
        case 'nut-chol':
            content = '<span class="bio-label">LYMPH PATHWAY - Cholesterol via Chylomicron</span>'
                + '<p>Dietary cholesterol (esterified and free) is incorporated into <span class="term">chylomicrons</span> alongside other lipids. It cannot dissolve in aqueous portal blood without lipoprotein packaging. After lymphatic transit (8-10 hours), chylomicrons deliver cholesterol to peripheral tissues and then to the liver as chylomicron remnants.</p>';
            break;
        case 'nut-protein':
            content = '<span class="bio-label">BLOOD CAPILLARY - Amino Acids via Portal Blood</span>'
                + '<p>Proteins are hydrolyzed to <span class="term">amino acids and di/tripeptides</span> by pancreatic proteases (trypsin, chymotrypsin, elastase) and brush border peptidases. These small, water-soluble molecules are absorbed via active transport (Na+-coupled cotransporters: PEPT1 for dipeptides) and enter the portal blood for hepatic first-pass processing.</p>';
            break;
        case 'nut-carb':
            content = '<span class="bio-label">BLOOD CAPILLARY - Monosaccharides via Portal Blood</span>'
                + '<p>Polysaccharides broken down to <span class="term">monosaccharides</span> (glucose, fructose, galactose) by salivary/pancreatic amylase and brush border disaccharidases (sucrase-isomaltase, lactase, maltase). Glucose/galactose absorbed via <span class="term">SGLT1</span> (Na+-dependent); fructose via GLUT5. Exit via GLUT2 into portal blood.</p>';
            break;
        case 'nut-sugar':
            content = '<span class="bio-label">BLOOD CAPILLARY - Simple Sugar (High Glycemic)</span>'
                + '<p>Monosaccharides cause a rapid rise in portal blood glucose, triggering pancreatic <span class="term">beta-cell</span> insulin secretion. High <span class="term">glycemic index</span>. GLUT2 transporters in enterocytes and hepatocytes are saturated quickly - potential for postprandial hyperglycemia if hepatic glycogen synthesis capacity is exceeded.</p>';
            break;
        case 'nut-foreign':
            content = '<span class="bio-label">FIBER - Passes to Large Intestine Unabsorbed</span>'
                + '<p><span class="term">Insoluble fiber</span> (cellulose, hemicellulose, lignin) resists all human digestive enzymes. It passes to the large intestine, adds bulk to stool, stimulates peristalsis (reducing colorectal cancer risk), and is fermented by colonic bacteria to produce SCFAs (butyrate, propionate, acetate). Not directly absorbed via either pathway.</p>';
            break;
        case 'nut-poison':
            content = '<span class="bio-label">TOXIN - Dual Pathway Risk</span>'
                + '<p>Absorbed toxins may enter portal circulation for <span class="term">hepatic first-pass metabolism</span> (cytochrome P450 enzymes). Lipophilic toxins (e.g., fat-soluble pesticides) may also enter the lymphatic pathway via chylomicron incorporation. The enterocyte can recognize some toxins and activate the emetic reflex via 5-HT3 receptor stimulation.</p>';
            break;
        default:
            content = '<span class="bio-label">UNKNOWN NUTRIENT</span><p>No pathway match identified.</p>';
    }
    showResult('divergence-result', content);
}

// ============================================================
//  ADAPTOR CONFIG (Station 7)
// ============================================================
function showAdaptorResult(side, content) {
    var el = document.getElementById('adaptor-result-' + side);
    if (el) { el.innerHTML = content; el.classList.add('show', 'pop'); setTimeout(function() { el.classList.remove('pop'); }, 420); }
}

function setConfig(side, action) {
    var content = '';
    switch (action) {
        case 'sparrow':
            content = '<span class="bio-label">GIZZARD MODULE ATTACHED (Granivore - Sparrow)</span>'
                + '<p>The muscular <span class="term">gizzard (ventriculus)</span> is equipped with gastroliths (ingested grit/pebbles). Powerful contractions (producing up to 200 N of force in larger species) physically grind hard seeds that would otherwise be indigestible. This mechanical pre-processing replaces the function of molars entirely.</p>';
            break;
        case 'hawk':
            content = '<span class="bio-label">SHORT TUBE CONFIGURED (Carnivore - Hawk)</span>'
                + '<p>The hawk GI tract is significantly shorter than herbivores relative to body length. High-protein animal tissue is easily denatured at low gastric pH and digested by proteases, requiring minimal fermentation. Short transit time also reduces microbial load from putrefying meat - an important sanitation adaptation.</p>';
            break;
        case 'crop':
            content = '<span class="bio-label">CROP CHAMBER ATTACHED (Esophageal Diverticulum)</span>'
                + '<p>The <span class="term">crop (ingluvies)</span> is a diverticulum of the esophagus. It stores food before enzymatic processing, allowing birds to ingest large quantities rapidly (reducing predation risk during feeding). Seeds are softened and moistened for easier gizzard processing. Crop milk (pigeon) is produced here for chick feeding.</p>';
            break;
        case 'longtube':
            content = '<span class="bio-label">EXTENDED INTESTINE ATTACHED (Herbivore Adaptation)</span>'
                + '<p>Longer intestinal length increases <span class="term">surface area and transit time</span>, providing more opportunity for microbial fermentation of resistant carbohydrates. Cecal tonsils at the ileocecal junction host fermentative bacteria. This is characteristic of herbivorous birds with high-cellulose diets requiring extended enzymatic and microbial processing.</p>';
            break;
        case 'sharpbeak':
            content = '<span class="bio-label">SHARP BEAK CONFIGURED (Raptor Adaptation)</span>'
                + '<p>The hooked beak of raptors evolved for tearing flesh from carcasses and live prey. The sharp tip punctures and the curved tomia (cutting edge) separates muscle tissue efficiently. This contrasts sharply with the conical, seed-cracking beak of finches/sparrows (optimized for husking hard seeds) and the flat lamellate beak of ducks (filter-feeding).</p>';
            break;
        case 'bilect':
            content = '<span class="bio-label">BILE DUCT MODULE ATTACHED</span>'
                + '<p>The <span class="term">bile duct</span> carries bile from the liver and gallbladder to the duodenum. Bile salts emulsify dietary fats into tiny micelles, dramatically increasing surface area for pancreatic lipase. This module is essential for processing fatty foods in granivores that consume oil-rich seeds.</p>';
            break;
        case 'pancreas':
            content = '<span class="bio-label">PANCREATIC MODULE ATTACHED</span>'
                + '<p>The <span class="term">pancreas</span> secretes digestive enzymes (amylase, lipase, proteases) and hormones (insulin, glucagon). In birds, the pancreatic duct enters the duodenum. This module is critical for starch and protein digestion in seed-eating species that require amylase to break down grain carbohydrates.</p>';
            break;
        case 'cecum':
            content = '<span class="bio-label">CECAL EXTENSION MODULE ATTACHED</span>'
                + '<p>The <span class="term">ceca</span> (singular: cecum) are paired blind sacs at the junction of small and large intestine. In granivorous birds, they harbor fermentative bacteria that break down cellulose and resistant starch into short-chain fatty acids (SCFAs). This dramatically increases energy extraction from plant matter.</p>';
            break;
        default:
            content = '<span class="bio-label">UNKNOWN MODULE</span><p>This module is not recognized by the system.</p>';
    }
    showAdaptorResult(side, content);
    adaptorState[side][action] = true;
    saveState();
}

// ============================================================
//  DEMO PAGE
// ============================================================
function runAllScenarios() {
    var demoMetrics = { intakeA:0, intakeJ:0, fat:0, water:0, lymph:0, cap:0, energy:0 };
    var meterBox    = document.getElementById('demo-meters');

    function updateDemoMeters() {
        if (!meterBox) return;
        meterBox.innerHTML =
            '<div class="demo-stat"><span class="demo-stat-label">S1 Intake Accepted</span><span class="demo-stat-value">' + demoMetrics.intakeA + '</span></div>' +
            '<div class="demo-stat"><span class="demo-stat-label">S1 Intake Jammed</span><span class="demo-stat-value">'   + demoMetrics.intakeJ + '</span></div>' +
            '<div class="demo-stat"><span class="demo-stat-label">S2 Fat-Soluble Stored</span><span class="demo-stat-value">'  + demoMetrics.fat   + '</span></div>' +
            '<div class="demo-stat"><span class="demo-stat-label">S2 Water-Sol. Excreted</span><span class="demo-stat-value">' + demoMetrics.water + '</span></div>' +
            '<div class="demo-stat"><span class="demo-stat-label">S5 Lymph/Lacteal</span><span class="demo-stat-value">'     + demoMetrics.lymph + '</span></div>' +
            '<div class="demo-stat"><span class="demo-stat-label">S5 Blood Capillary</span><span class="demo-stat-value">'   + demoMetrics.cap   + '</span></div>' +
            '<div class="demo-stat"><span class="demo-stat-label">S3 Energy Volume</span><span class="demo-stat-value">'     + demoMetrics.energy + '/3</span></div>';
    }
    updateDemoMeters();

    var resultEl = document.getElementById('demo-result');
    resultEl.innerHTML = '';
    resultEl.classList.add('show');

    var steps = [
        { desc: 'S1: Herbivore fuel (Nut) accepted. Flat molariform teeth crush the shell; cellulose wall breached.', action: function() { demoMetrics.intakeA++; animateIntake(true); } },
        { desc: 'S1: Insect (chitin) dropped - JAMMED. Herbivore enzyme profile lacks chitinase; funnel blocked.', action: function() { demoMetrics.intakeJ++; animateIntake(false); } },
        { desc: 'S2: Vitamin D (fat-soluble) - packaged into chylomicrons, routed to adipose tissue via lymph. Stored long-term.', action: function() { demoMetrics.fat++; } },
        { desc: 'S2: Vitamin C (water-soluble) - absorbed, excess filtered by kidneys into urine. Cannot be stored.', action: function() { demoMetrics.water++; } },
        { desc: 'S5: Lipid token enters central lacteal as chylomicron. Routes through thoracic duct to bloodstream.', action: function() { demoMetrics.lymph++; } },
        { desc: 'S5: Amino acid token - SGLT1/GLUT transporters deliver directly to portal blood capillary and liver.', action: function() { demoMetrics.cap++; } },
        { desc: 'S3: Cheese (+2 energy) - energy accumulates toward gate-opening threshold (3 units required).', action: function() { demoMetrics.energy += 2; } },
        { desc: 'S3: PHOSPHORUS PILLAR REMOVED - skeletal instability demonstrated. Models osteomalacia from Ca-P mineral deficiency.', action: function() {} },
        { desc: 'S4: Stomach acid + protein added - pepsin activates at pH <3. Tilt simulates pyloric release into duodenum.', action: function() {} },
        { desc: 'S7: Gizzard module (sparrow) - mechanical seed-grinding without teeth. Sharp beak (hawk) - flesh-tearing adaptation.', action: function() {} },
        { desc: 'DEMO COMPLETE. All 7 stations explored. Each mechanism reflects a key physiological principle from Animal Anatomy and Physiology.', action: function() {} }
    ];

    steps.forEach(function(step, i) {
        setTimeout(function() {
            var p = document.createElement('p');
            p.style.cssText = 'padding:.5rem .75rem;margin:.3rem 0;background:#fff;border-radius:6px;border-left:3px solid #2a6db5;font-size:.88rem;line-height:1.5;animation:pop .4s ease both;';
            p.textContent = step.desc;
            resultEl.appendChild(p);
            if (step.action) step.action();
            updateDemoMeters();
            animateMaze();
        }, i * 1350);
    });
}

function runBasedOnState() {
    loadState();
    var meterBox = document.getElementById('demo-meters');
    if (meterBox) {
        meterBox.innerHTML =
            '<div class="demo-stat"><span class="demo-stat-label">S1 Accepted</span><span class="demo-stat-value">'         + intakeAccepted + '</span></div>' +
            '<div class="demo-stat"><span class="demo-stat-label">S1 Jammed</span><span class="demo-stat-value">'            + intakeJammed   + '</span></div>' +
            '<div class="demo-stat"><span class="demo-stat-label">S2 Fat Stored</span><span class="demo-stat-value">'        + fatCount       + '</span></div>' +
            '<div class="demo-stat"><span class="demo-stat-label">S2 Water Excreted</span><span class="demo-stat-value">'    + waterCount     + '</span></div>' +
            '<div class="demo-stat"><span class="demo-stat-label">S5 Lymph</span><span class="demo-stat-value">'             + lymphCount     + '</span></div>' +
            '<div class="demo-stat"><span class="demo-stat-label">S5 Capillary</span><span class="demo-stat-value">'         + capillaryCount + '</span></div>' +
            '<div class="demo-stat"><span class="demo-stat-label">S3 Energy</span><span class="demo-stat-value">'            + energyTotal    + '/3</span></div>' +
            '<div class="demo-stat"><span class="demo-stat-label">S3 Pillar Removed</span><span class="demo-stat-value">'    + (pillarRemovedFlag ? 'Yes' : 'No') + '</span></div>' +
            '<div class="demo-stat"><span class="demo-stat-label">S4 Acid Drops</span><span class="demo-stat-value">'        + acidCount      + '</span></div>' +
            '<div class="demo-stat"><span class="demo-stat-label">S4 Buffer Drops</span><span class="demo-stat-value">'      + bufferCount    + '</span></div>';
    }
    var resultEl = document.getElementById('demo-result');
    if (!resultEl) return;
    resultEl.classList.add('show');

    var summaries = [
        { ok: intakeAccepted > 0, text: 'S1 Herbivore Intake: ' + intakeAccepted + ' accepted, ' + intakeJammed + ' jammed. Demonstrates dietary specificity of herbivore digestive morphology.' },
        { ok: fatCount > 0 || waterCount > 0, text: 'S2 Vitamin Partition: ' + fatCount + ' fat-soluble stored (adipose/liver), ' + waterCount + ' water-soluble excreted. Illustrates differential tissue storage and accumulation toxicity.' },
        { ok: energyTotal >= 3, text: 'S3 Nutritional Stress: Energy=' + energyTotal + '/3. Gate ' + (energyTotal >= 3 ? 'OPEN (sufficient intake)' : 'CLOSED (undernutrition)') + '. Pillar ' + (pillarRemovedFlag ? 'removed - structural failure shown.' : 'intact.') },
        { ok: acidCount > 0, text: 'S4 Pepsin pH Gate: Acid drops: ' + acidCount + ', Buffer: ' + bufferCount + ', Inhibitor: ' + inhibitorCount + '. ' + (acidCount > 0 && bufferCount === 0 ? 'Acid conditions active - pepsin functional.' : 'Conditions not optimal for peptic digestion.') },
        { ok: lymphCount > 0 || capillaryCount > 0, text: 'S5 Nutrient Divergence: ' + lymphCount + ' lipid(s) to lymph/lacteal, ' + capillaryCount + ' carb/protein(s) to portal blood. Reflects chylomicron vs. direct vascular absorption mechanism.' }
    ];

    resultEl.innerHTML = '';
    summaries.forEach(function(s, i) {
        setTimeout(function() {
            var p = document.createElement('p');
            p.style.cssText = 'padding:.5rem .75rem;margin:.3rem 0;background:#fff;border-radius:6px;border-left:3px solid ' + (s.ok ? '#16a34a' : '#c0392b') + ';font-size:.88rem;';
            p.textContent = (s.ok ? '[OK] ' : '[INCOMPLETE] ') + s.text;
            resultEl.appendChild(p);
            animateMaze();
        }, i * 600);
    });
}

// ============================================================
//  MAZE CANVAS ANIMATION (Demo Page)
// ============================================================
function animateMaze() {
    var canvas = document.getElementById('maze-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W   = canvas.width;
    var H   = canvas.height;

    var stations = [
        { x:55,  y:55,  label:'S1',  sub:'Intake',     color:'#27ae60' },
        { x:170, y:55,  label:'S2',  sub:'Vitamins',   color:'#8e44ad' },
        { x:285, y:115, label:'S3',  sub:'Energy',     color:'#e67e22' },
        { x:400, y:115, label:'S4',  sub:'pH Gate',    color:'#c0392b' },
        { x:500, y:195, label:'S5',  sub:'Diverge',    color:'#2980b9' },
        { x:390, y:280, label:'S6',  sub:'Microbiome', color:'#16a085' },
        { x:230, y:330, label:'S7',  sub:'Adaptor',    color:'#d4a017' }
    ];

    function drawStatic() {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = '#c8d3e0';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        stations.forEach(function(s, i) {
            if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);

        stations.forEach(function(s) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, 20, 0, 2 * Math.PI);
            ctx.fillStyle = s.color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px Segoe UI, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(s.label, s.x, s.y);

            ctx.fillStyle = '#475569';
            ctx.font = '10px Segoe UI, sans-serif';
            ctx.textBaseline = 'top';
            ctx.fillText(s.sub, s.x, s.y + 24);
        });
    }

    drawStatic();

    var segIdx = 0;
    var x      = stations[0].x;
    var y      = stations[0].y;
    var speed  = 2.5;

    function frame() {
        if (segIdx >= stations.length - 1) return;
        var target = stations[segIdx + 1];
        var dx     = target.x - x;
        var dy     = target.y - y;
        var dist   = Math.sqrt(dx * dx + dy * dy);
        if (dist > speed) {
            x += (dx / dist) * speed;
            y += (dy / dist) * speed;
        } else {
            x = target.x; y = target.y;
            segIdx++;
        }
        drawStatic();
        var grad = ctx.createRadialGradient(x, y, 1, x, y, 11);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(1, stations[Math.min(segIdx, stations.length - 1)].color);
        ctx.beginPath();
        ctx.arc(x, y, 11, 0, 2 * Math.PI);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        requestAnimationFrame(frame);
    }
    frame();
}

// legacy compatibility
function floraToggle(remove) {
    floraEffect(remove ? 'remove' : 'restore');
}
