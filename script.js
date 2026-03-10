// Simulation functions

// DRAG & DROP handlers
function allowDrop(ev) {
    ev.preventDefault();
    ev.target.classList.add('dragover');
}
function removeDragOver(ev) {
    ev.target.classList.remove('dragover');
}
function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

// global error logging to help debugging
window.addEventListener('error', e => {
    console.error('Global error:', e.message, e.error);
    const dbg = document.getElementById('debug-output');
    if (dbg) dbg.textContent += e.message + '\n';
});

// --- application-wide state (persisted across pages) ---
let intakeAccepted = 0;
let intakeJammed = 0;
let fatCount = 0;
let waterCount = 0;
let lymphCount = 0;
let capillaryCount = 0;
let energyTotal = 0;
let pillarRemovedFlag = false;
let pHState = { acid: false, inhibitor: false, buffer: false, protein: false };
let acidCount = 0;
let bufferCount = 0;
let inhibitorCount = 0;
let proteinCount = 0;
let floraPresent = true;
// adaptor state separated by panel side (hawk vs sparrow)
let adaptorState = {
    hawk: { sparrow:false, hawk:false, crop:false, longtube:false, sharpbeak:false },
    sparrow: { sparrow:false, hawk:false, crop:false, longtube:false, sharpbeak:false }
};

// persistence helpers
function saveState() {
    const state = {
        intakeAccepted,
        intakeJammed,
        fatCount,
        waterCount,
        lymphCount,
        capillaryCount,
        energyTotal,
        pillarRemovedFlag,
        pHState,
        acidCount,
        bufferCount,
        inhibitorCount,
        proteinCount,
        floraPresent,
        adaptorState // now includes hawk and sparrow sub-objects
    };
    try {
        localStorage.setItem('demoState', JSON.stringify(state));
    } catch(e) {
        console.warn('Unable to save state', e);
    }
}

function loadState() {
    try {
        const s = localStorage.getItem('demoState');
        if (s) {
            const st = JSON.parse(s);
            intakeAccepted = st.intakeAccepted || 0;
            intakeJammed = st.intakeJammed || 0;
            fatCount = st.fatCount || 0;
            waterCount = st.waterCount || 0;
            lymphCount = st.lymphCount || 0;
            capillaryCount = st.capillaryCount || 0;
            energyTotal = st.energyTotal || 0;
            pillarRemovedFlag = st.pillarRemovedFlag || false;
            pHState = st.pHState || { acid:false, inhibitor:false, buffer:false, protein:false };
            acidCount = st.acidCount || 0;
            bufferCount = st.bufferCount || 0;
            inhibitorCount = st.inhibitorCount || 0;
            proteinCount = st.proteinCount || 0;
            floraPresent = typeof st.floraPresent === 'boolean' ? st.floraPresent : true;
            adaptorState = st.adaptorState || adaptorState;
        }
    } catch(e) {
        console.warn('Unable to load state', e);
    }
}

// initialize on script load
loadState();

// after state loaded, update any visible meters/gates on this page
function restoreUI() {
    updateIntakeMeter();
    updateVitaminCounters();
    updateDivergenceCounters();
    updateEnergyMeter();
    updatePhMeter();
    // recalc gate appearance without modifying energyTotal
    const gate = document.getElementById('energy-gate');
    if (gate) {
        if (energyTotal >= 3) {
            gate.classList.add('open','flowing');
            gate.classList.remove('closed','paused');
            gate.textContent='Gate: OPEN';
        } else {
            gate.classList.add('closed','paused');
            gate.classList.remove('open','flowing');
            gate.textContent='Gate: CLOSED';
        }
    }
}

window.addEventListener('DOMContentLoaded', restoreUI);

function updateIntakeMeter() {
    const meter = document.getElementById('intake-meter');
    if (meter) {
        meter.textContent = `Accepted: ${intakeAccepted} | Jammed: ${intakeJammed}`;
    }
    saveState();
}

function resetIntake() {
    intakeAccepted = 0;
    intakeJammed = 0;
    updateIntakeMeter();
    const meter = document.getElementById('intake-meter');
    if (meter) meter.classList.remove('highlight');
    showResult('intake-result', '<p>Station reset.</p>');
    saveState();
}

// --- station2 vitamin counters ---
// (fatCount & waterCount defined in application-wide state)

function updateVitaminCounters() {
    const storage = document.getElementById('storage-counter');
    const waste = document.getElementById('waste-counter');
    if (storage) storage.textContent = `Stored (fat): ${fatCount}`;
    if (waste) waste.textContent = `Wasted (water): ${waterCount}`;
    saveState();
}

function resetVitamin() {
    fatCount = 0;
    waterCount = 0;
    updateVitaminCounters();
    const s = document.getElementById('storage-counter');
    const w = document.getElementById('waste-counter');
    if (s) s.classList.remove('highlight');
    if (w) w.classList.remove('highlight');
    showResult('vitamin-result','<p>Station reset.</p>');
    saveState();
}

// --- station5 divergence counters ---
// (lymphCount & capillaryCount are part of application-wide state)

function updateDivergenceCounters() {
    const l = document.getElementById('lymph-counter');
    const c = document.getElementById('capillary-counter');
    if (l) l.textContent = `Lymph: ${lymphCount}`;
    if (c) c.textContent = `Capillary: ${capillaryCount}`;
    saveState();
}

function resetDivergence() {
    lymphCount = 0;
    capillaryCount = 0;
    updateDivergenceCounters();
    const l = document.getElementById('lymph-counter');
    const c = document.getElementById('capillary-counter');
    if (l) l.classList.remove('highlight');
    if (c) c.classList.remove('highlight');
    showResult('divergence-result','<p>Station reset.</p>');
    saveState();
}

// --- station6 reset ---
function resetMicrobiome() {
    const flow = document.getElementById('flow-indicator');
    if (flow) {
        flow.className='flow slow';
        flow.textContent='Water flow normal';
    }
    showResult('microbiome-result','<p>Station reset.</p>');
}

// --- station7 reset ---
function resetAdaptor() {
    showResult('adaptor-result','<p>Station reset.</p>');
}

// station-specific drop handlers
function dropIntake(ev) {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text");
    // determine type before we modify counters
    const type = document.getElementById(id).getAttribute('data-type');
    intakeChoice(id);
    // animate along digestive pathway
    animateIntake(type === 'herbivore');
    // update counters
    if (type === 'herbivore') intakeAccepted++;
    else if (type === 'carnivore') intakeJammed++;
    updateIntakeMeter();
    // flash meter
    const meter = document.getElementById('intake-meter');
    if (meter) {
        meter.classList.add('highlight');
        setTimeout(() => meter.classList.remove('highlight'), 300);
    }
}

function dropVitamin(ev) {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text");
    vitaminChoice(id);
    const type = document.getElementById(id).getAttribute('data-type');
    if (type === 'fat') fatCount++;
    else if (type === 'water') waterCount++;
    updateVitaminCounters();
    // highlight the relevant counter
    let elem = null;
    if (type === 'fat') elem = document.getElementById('storage-counter');
    else if (type === 'water') elem = document.getElementById('waste-counter');
    if (elem) {
        elem.classList.add('highlight');
        setTimeout(() => elem.classList.remove('highlight'), 500);
    }
}

function dropEnergy(ev) {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text");
    const val = parseInt(document.getElementById(id).getAttribute('data-value'));
    energyGate(val);
}

function dropDivergence(ev) {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text");
    divergenceChoice(id);
    const type = document.getElementById(id).getAttribute('data-type');
    if (type === 'lipid') lymphCount++;
    else if (type === 'protein' || type === 'carb') capillaryCount++;
    updateDivergenceCounters();
    // flash appropriate counter
    let cntElem = (type === 'lipid') ? document.getElementById('lymph-counter') : document.getElementById('capillary-counter');
    if (cntElem) {
        cntElem.classList.add('highlight');
        setTimeout(() => cntElem.classList.remove('highlight'), 300);
    }
}

function dropFlora(ev) {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text");
    const action = document.getElementById(id).getAttribute('data-action');
    floraEffect(action);
}

function floraEffect(action) {
    let content = '';
    const flow = document.getElementById('flow-indicator');
    switch(action) {
        case 'remove':
            content = `<p>Antibiotic removed flora – water rushes through too quickly (diarrhea).</p>`;
            if (flow) flow.className='flow fast', flow.textContent='Water flow: too fast';
            break;
        case 'restore':
            content = `<p>Bacterial flora restored – normal absorption resumes.</p>`;
            if (flow) flow.className='flow slow', flow.textContent='Water flow: normal';
            break;
        case 'probiotic':
            content = `<p>Probiotic added – beneficial microbes proliferate, system more resilient.</p>`;
            if (flow) flow.className='flow slow', flow.textContent='Water flow: slightly slowed by healthy flora';
            break;
        case 'pathogen':
            content = `<p>Pathogen introduced – inflammation occurs, absorption impaired.</p>`;
            if (flow) flow.className='flow fast', flow.textContent='Water flow: erratic';
            break;
        case 'prebiotic':
            content = `<p>Prebiotic fiber added – bacteria feed and flourish, supporting absorption.</p>`;
            if (flow) flow.className='flow slow', flow.textContent='Water flow: stable';
            break;
        default:
            content = `<p>No noticeable change.</p>`;
    }
    showResult('microbiome-result', content);
}

// state for adaptor configuration (already declared in global state at top)

function dropAdaptor(ev) {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text");
    const action = document.getElementById(id).getAttribute('data-action');
    // determine side from drop zone id
    const zoneId = ev.target.id;
    const side = zoneId.startsWith('hawk') ? 'hawk' : zoneId.startsWith('sparrow') ? 'sparrow' : null;
    if (!side) return;
    // update state for that side
    if (adaptorState[side].hasOwnProperty(action)) {
        adaptorState[side][action] = true;
    }
    switch(action) {
        case 'sparrow':
            setConfig(side,'sparrow');
            break;
        case 'hawk':
            setConfig(side,'hawk');
            break;
        case 'crop':
            setConfig(side,'crop');
            break;
        case 'longtube':
            setConfig(side,'longtube');
            break;
        case 'sharpbeak':
            setConfig(side,'sharpbeak');
            break;
        default:
            showAdaptorResult(side,'<p>Mismatch: wrong module attached, system fails.</p>');
    }
}

function dropTestFood(ev) {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text");
    const food = document.getElementById(id).textContent;
    const zoneId = ev.target.id;
    const side = zoneId.startsWith('hawk') ? 'hawk' : zoneId.startsWith('sparrow') ? 'sparrow' : null;
    if (!side) return;
    let message = '';
    const state = adaptorState[side];
    if (state.hawk && food.toLowerCase().includes('meat')) {
        message = `<p>The ${side} hawk configuration processes meat successfully.</p>`;
    } else if (state.sparrow && food.toLowerCase().includes('seed')) {
        message = `<p>The ${side} sparrow configuration grinds seeds efficiently.</p>`;
    } else if (state.crop && food.toLowerCase().includes('seed')) {
        message = `<p>Crop chamber stores seeds before grinding – good for granivores.</p>`;
    } else if (state.longtube && food.toLowerCase().includes('grass')) {
        message = `<p>Extended intestine helps digest fibrous plant matter.</p>`;
    } else {
        message = `<p>The meal doesn't suit the current configuration; it gets stuck or wasted.</p>`;
    }
    showAdaptorResult(side, message);
}


function showResult(elementId, content) {
    const result = document.getElementById(elementId);
    result.innerHTML = content;
    result.classList.add('show');
    // pop animation
    result.classList.add('pop');
    setTimeout(() => result.classList.remove('pop'), 400);
}

// Station1 intake animation along a simplified digestive pathway (vertical)
function animateIntake(isHerbivore) {
    const path = document.getElementById('intake-path');
    if (!path) return;
    const marker = document.createElement('div');
    marker.className = 'intake-marker';
    marker.classList.add(isHerbivore ? 'accepted' : 'rejected');
    path.appendChild(marker);
    // trigger CSS animation
    requestAnimationFrame(() => {
        if (isHerbivore) marker.classList.add('slide-down');
        else marker.classList.add('slide-up');
    });
    marker.addEventListener('animationend', () => {
        marker.remove();
    });
}


function intakeChoice(id) {
    let content = '';
    const zone = document.getElementById('intake-zone');
    switch(id) {
        case 'item-nut':
            content = `<p>Nut dropped – passed smoothly. Herbivores chew these well.</p>`;
            break;
        case 'item-leaf':
            content = `<p>Leaf dropped – passed, rich in cellulose.</p>`;
            break;
        case 'item-berry':
            content = `<p>Berry dropped – sweet and accepted.</p>`;
            break;
        case 'item-twig':
            content = `<p>Twig dropped – too tough, it stuck in the funnel.</p>`;
            break;
        case 'item-grass':
            content = `<p>Grass dropped – passes but slows due to fiber.</p>`;
            break;
        case 'item-insect':
            content = `<p>Plastic insect – funnel jammed! Not part of herbivore diet.</p>`;
            if (zone) {
                zone.classList.add('jam');
                setTimeout(() => zone.classList.remove('jam'), 500);
            }
            break;
        case 'item-eggshell':
            content = `<p>Eggshell – rejected and bounces back.</p>`;
            if (zone) {
                zone.classList.add('jam');
                setTimeout(() => zone.classList.remove('jam'), 500);
            }
            break;
        case 'item-meat':
            content = `<p>Meat chunk – completely jammed; carnivore material is catastrophic.</p>`;
            if (zone) {
                zone.classList.add('jam');
                setTimeout(() => zone.classList.remove('jam'), 500);
            }
            break;
        default:
            content = `<p>Unknown object – the system doesn't recognize it and it is ejected.</p>`;
    }
    showResult('intake-result', content);
}

function vitaminChoice(id) {
    let content = '';
    switch(id) {
        case 'vit-b':
            content = `
                <p>Vitamin B dropped (water-soluble).</p>
                <p>Filtered out, excreted in urine.</p>
            `;
            break;
        case 'vit-c':
            content = `
                <p>Vitamin C dropped (water-soluble).</p>
                <p>Sent to waste; excess can cause diarrhea.</p>
            `;
            break;
        case 'vit-d':
            content = `
                <p>Vitamin D dropped (fat-soluble).</p>
                <p>Shunted to storage in adipose tissue.</p>
            `;
            break;
        case 'vit-a':
            content = `
                <p>Vitamin A dropped (fat-soluble).</p>
                <p>Stored in liver cells for future use.</p>
            `;
            break;
        case 'vit-k':
            content = `
                <p>Vitamin K dropped (fat-soluble).</p>
                <p>Crucial for blood clotting, stored in the liver.</p>
            `;
            break;
        case 'vit-zinc':
            content = `
                <p>Zinc pill – mineral, not a vitamin; it passes through.</p>
            `;
            break;
        case 'vit-stone':
            content = `
                <p>Stone – clearly not nutritional. Rejected.</p>
            `;
            break;
        default:
            content = `<p>Unrecognized token – nothing happens.</p>`;
    }
    showResult('vitamin-result', content);
}

// energyTotal and pillarRemovedFlag defined earlier as part of state

function updateEnergyMeter() {
    const meter = document.getElementById('energy-meter');
    if (meter) {
        meter.textContent = `Energy Volume: ${energyTotal}`;
    }
    saveState();
}

function removePhosphorus() {
    const pillar = document.getElementById('phosphorus-pillar');
    pillarRemovedFlag = true;
    if (pillar) pillar.classList.add('removed');
    const content = `
        <p>Phosphorus Pillar Removed: the structural support collapses, demonstrating skeletal instability from mineral deficiency.</p>
    `;
    showResult('stress-result', content + document.getElementById('stress-result').innerHTML);
}

function energyGate(volume) {
    // accumulate or deplete
    energyTotal += volume;
    updateEnergyMeter();
    const em = document.getElementById('energy-meter');
    if (em) {
        em.classList.add('highlight');
        setTimeout(() => em.classList.remove('highlight'), 300);
    }
    let content = '';
    const threshold = 3;
    const gate = document.getElementById('energy-gate');
    if (energyTotal >= threshold) {
        content = `<p>Accumulated energy (${energyTotal}) meets threshold. Gate opens.</p>`;
        if (gate) {
            gate.classList.remove('closed');
            gate.classList.add('open');
            gate.classList.add('flowing');
            gate.classList.remove('paused');
            gate.textContent='Gate: OPEN';
        }
    } else {
        content = `<p>Energy volume now ${energyTotal}. Gate remains closed (needs ${threshold}).</p>`;
        if (gate) {
            gate.classList.remove('open');
            gate.classList.add('closed');
            gate.classList.add('paused');
            gate.classList.remove('flowing');
            gate.textContent='Gate: CLOSED';
        }
    }
    showResult('stress-result', content + document.getElementById('stress-result').innerHTML);
}

function burnEnergy() {
    if (energyTotal > 0) {
        energyGate(-1);
        showResult('stress-result', '<p>Energy burned by activity.</p>' + document.getElementById('stress-result').innerHTML);
    } else {
        showResult('stress-result', '<p>No energy left to burn.</p>' + document.getElementById('stress-result').innerHTML);
    }
}

function testEnergyGate() {
    const content = `
        <p>Energy Gate Test: With sufficient food volume, the gate opens. Insufficient volume keeps it closed, halting the process.</p>
    `;
    showResult('stress-result', content + document.getElementById('stress-result').innerHTML);
}

function resetStress() {
    energyTotal = 0;
    updateEnergyMeter();
    const gate = document.getElementById('energy-gate');
    if (gate) {
        gate.classList.remove('open','flowing');
        gate.classList.add('closed','paused');
        gate.textContent='Gate: CLOSED';
    }
    const pillar = document.getElementById('phosphorus-pillar');
    if (pillar) pillar.classList.remove('removed');
    pillarRemovedFlag = false;
    showResult('stress-result','<p>Station reset. Pillar restored and energy cleared.</p>');
    saveState();
}

// state tracking for station 4
// (already declared above as part of application-wide state)

function updatePhMeter() {
    const meter = document.getElementById('ph-meter');
    if (meter) {
        meter.textContent = `Acid:${acidCount} Buffer:${bufferCount} Inhibitor:${inhibitorCount} Protein:${proteinCount}`;
    }
    saveState();
}

function dropPh(ev) {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text");
    const type = document.getElementById(id).getAttribute('data-type');
    if (type && pHState.hasOwnProperty(type)) {
        pHState[type] = true;
    }
    // update counters
    switch(type) {
        case 'acid': acidCount++; break;
        case 'buffer': bufferCount++; break;
        case 'inhibitor': inhibitorCount++; break;
        case 'protein': proteinCount++; break;
    }
    updatePhMeter();
    // flash ph meter
    const phm = document.getElementById('ph-meter');
    if (phm) {
        phm.classList.add('highlight');
        setTimeout(() => phm.classList.remove('highlight'), 300);
    }
    phChoice();
}

function phChoice() {
    let content = '';
    if (pHState.buffer) {
        content += '<p>Alkaline buffer added – pH rises, pepsin becomes inactive.</p>';
    }
    if (pHState.inhibitor) {
        content += '<p>Pepsin inhibitor present – enzyme blocked regardless of pH.</p>';
    }
    if (pHState.acid && !pHState.buffer && !pHState.inhibitor) {
        content += '<p>Strong acid environment: pepsin active, ready to digest proteins.</p>';
    }
    if (pHState.protein) {
        content += '<p>Protein bead sitting in stomach. Use the tilt button when conditions are right.</p>';
    }
    if (!content) content = '<p>No effective substance dropped yet.</p>';
    showResult('ph-result', content);
}

function tiltStomach() {
    let content = '';
    if (pHState.protein) {
        if (pHState.acid && !pHState.buffer && !pHState.inhibitor) {
            content = '<p>Tilt: protein bead slides into intestine successfully.</p>';
        } else {
            content = '<p>Tilt: protein bead remains – conditions unsuitable for movement.</p>';
        }
    } else {
        content = '<p>No protein bead to tilt.</p>';
    }
    showResult('ph-result', content);
}

function resetPh() {
    pHState = { acid: false, inhibitor: false, buffer: false, protein: false };
    acidCount = bufferCount = inhibitorCount = proteinCount = 0;
    updatePhMeter();
    const phm = document.getElementById('ph-meter');
    if (phm) phm.classList.remove('highlight');
    showResult('ph-result', '<p>Station reset. Drop new items to start over.</p>');
    saveState();
}

function divergenceChoice(id) {
    let content = '';
    switch(id) {
        case 'nut-lipid':
            content = `<p>Lipid token dropped – routed to lymphatic lacteal.</p>`;
            break;
        case 'nut-chol':
            content = `<p>Cholesterol dropped – also joins lymph through lacteal.</p>`;
            break;
        case 'nut-protein':
            content = `<p>Protein token dropped – enters capillary blood.</p>`;
            break;
        case 'nut-carb':
            content = `<p>Carbohydrate token dropped – likewise to capillary.</p>`;
            break;
        case 'nut-sugar':
            content = `<p>Simple sugar – spikes blood glucose via capillaries.</p>`;
            break;
        case 'nut-foreign':
            content = `<p>Fiber token – gets stuck and blocks the exit.</p>`;
            break;
        case 'nut-poison':
            content = `<p>Toxin dropped – system alerts and shuts down.</p>`;
            break;
        default:
            content = `<p>Unknown nutrient – nothing occurs.</p>`;
    }
    showResult('divergence-result', content);
}

function floraToggle(remove) {
    let content = '';
    if (remove) {
        content = `<p>Bacterial Flora Removed: water rushes through, representing diarrhea.</p>`;
        floraPresent = false;
    } else {
        content = `<p>Bacterial Flora Restored: normal water absorption resumes.</p>`;
        floraPresent = true;
    }
    showResult('microbiome-result', content);
    saveState();
}

// generic config setter for a given side
function showAdaptorResult(side, content) {
    const el = document.getElementById(`adaptor-result-${side}`);
    if (el) {
        el.innerHTML = content;
        el.classList.add('show');
        el.classList.add('pop');
        setTimeout(() => el.classList.remove('pop'), 400);
    }
}

function setConfig(side, action) {
    let content = '';
    switch(action) {
        case 'sparrow':
            content = `<p>Sparrow Setup: Gizzard module attached with pebbles for grinding, longer tubing for granivorous digestion.</p>`;
            break;
        case 'hawk':
            content = `<p>Hawk Setup: Maze shortened, Gizzard bypassed for direct meat processing.</p>`;
            break;
        case 'crop':
            content = `<p>Crop Chamber attached: seeds and grains can be stored and moistened before grinding.</p>`;
            break;
        case 'longtube':
            content = `<p>Extended intestine module added: allows more time for cellulose digestion, typical of herbivores.</p>`;
            break;
        case 'sharpbeak':
            content = `<p>Sharp beak configuration: designed for tearing flesh, indicates carnivorous specialization.</p>`;
            break;
        default:
            content = '<p>Unknown module.</p>';
    }
    showAdaptorResult(side, content);
    // persist
    adaptorState[side][action] = true;
    saveState();
}

// renamed to represent running all favorable scenarios
function runAllScenarios() {
    // initialize demo metrics
    const demoMetrics = {
        intakeAccepted:0,
        intakeJammed:0,
        fat:0,
        water:0,
        lymph:0,
        capillary:0,
        energy:0,
        ph:{acid:0,buffer:0,inhibitor:0,protein:0}
    };
    const meterBox = document.getElementById('demo-meters');
    function updateDemoMeters() {
        if (!meterBox) return;
        meterBox.textContent =
            `Intake A:${demoMetrics.intakeAccepted} J:${demoMetrics.intakeJammed} | `+
            `Fat:${demoMetrics.fat} W:${demoMetrics.water} | `+
            `Lymph:${demoMetrics.lymph} Cap:${demoMetrics.capillary} | `+
            `Energy:${demoMetrics.energy} | `+
            `pH a${demoMetrics.ph.acid} b${demoMetrics.ph.buffer} i${demoMetrics.ph.inhibitor} p${demoMetrics.ph.protein}`;
    }
    updateDemoMeters();

    const resultEl = document.getElementById('demo-result');
    resultEl.innerHTML = '';

    const steps = [
        {desc:'Station1: drop apple (herbivore fuel).', action:()=>{demoMetrics.intakeAccepted++; updateDemoMeters(); animateIntake(true);}},
        {desc:'Station1: drop rock (jam).', action:()=>{demoMetrics.intakeJammed++; updateDemoMeters(); animateIntake(false);}},
        {desc:'Station2: drop vitamin D (fat-soluble).', action:()=>{demoMetrics.fat++; updateDemoMeters();}},
        {desc:'Station2: drop vitamin C (water-soluble).', action:()=>{demoMetrics.water++; updateDemoMeters();}},
        {desc:'Station5: drop lipid token.', action:()=>{demoMetrics.lymph++; updateDemoMeters();}},
        {desc:'Station5: drop protein token.', action:()=>{demoMetrics.capillary++; updateDemoMeters();}},
        {desc:'Station3: add energy volume by dropping cheese.', action:()=>{demoMetrics.energy+=2; updateDemoMeters();}},
        {desc:'Station3: remove Phosphorus pillar to show collapse.', action:()=>{/* just note */}},
        {desc:'Station4: add acid and protein and tilt.', action:()=>{demoMetrics.ph.acid++; demoMetrics.ph.protein++; updateDemoMeters();}},
        {desc:'Demo complete. Explore stations yourself!', action:()=>{}}
    ];

    // run steps with delay
    steps.forEach((step,i)=>{
        setTimeout(() => {
            const p = document.createElement('p');
            p.textContent = step.desc;
            p.classList.add('pop');
            resultEl.appendChild(p);
            if (step.action) step.action();
            // restart maze animation on each step for visual interest
            animateMaze();
            // remove pop class after animation
            setTimeout(() => p.classList.remove('pop'), 400);
        }, i * 1200);
    });
}

// new function that uses current global station state
function runBasedOnState() {
    // make sure we have the latest values from storage as user may have just navigated here
    loadState();
    const resultEl = document.getElementById('demo-result');
    resultEl.innerHTML = '';
    const meterBox = document.getElementById('demo-meters');
    function updateDemoMetersBasedOnState() {
        if (!meterBox) return;
        meterBox.textContent =
            `Intake A:${intakeAccepted} J:${intakeJammed} | `+
            `Fat:${fatCount} W:${waterCount} | `+
            `Lymph:${lymphCount} Cap:${capillaryCount} | `+
            `Energy:${energyTotal} | `+
            `pH acid:${pHState.acid?1:0} buffer:${pHState.buffer?1:0} inhibitor:${pHState.inhibitor?1:0} protein:${pHState.protein?1:0}`;
    }
    updateDemoMetersBasedOnState();

    const lines = [
        `Station1: Accepted ${intakeAccepted}, Jammed ${intakeJammed}`,
        `Station2: Stored ${fatCount}, Wasted ${waterCount}`,
        `Station5: Lymph ${lymphCount}, Capillary ${capillaryCount}`,
        `Station3: Energy volume ${energyTotal}`,
        `Station4: pH items acid:${pHState.acid?1:0}, buffer:${pHState.buffer?1:0}, inhibitor:${pHState.inhibitor?1:0}, protein:${pHState.protein?1:0}`
    ];
    lines.forEach(text => {
        const p = document.createElement('p');
        p.textContent = text;
        p.classList.add('pop');
        resultEl.appendChild(p);
        setTimeout(() => p.classList.remove('pop'), 400);
    });
    animateMaze();
}

function animateMaze() {
    const canvas = document.getElementById('maze-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw simple maze path
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(50, 50);
    ctx.lineTo(200, 50);
    ctx.lineTo(200, 150);
    ctx.lineTo(400, 150);
    ctx.lineTo(400, 250);
    ctx.lineTo(550, 250);
    ctx.stroke();

    // Animate a dot moving through the maze
    let x = 50, y = 50;
    const path = [
        {x: 200, y: 50},
        {x: 200, y: 150},
        {x: 400, y: 150},
        {x: 400, y: 250},
        {x: 550, y: 250}
    ];
    let step = 0;

    const animate = () => {
        if (step < path.length) {
            const target = path[step];
            const dx = target.x - x;
            const dy = target.y - y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            if (distance > 1) {
                x += dx / distance * 2;
                y += dy / distance * 2;
            } else {
                step++;
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(50, 50);
            ctx.lineTo(200, 50);
            ctx.lineTo(200, 150);
            ctx.lineTo(400, 150);
            ctx.lineTo(400, 250);
            ctx.lineTo(550, 250);
            ctx.stroke();
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, 2 * Math.PI);
            ctx.fill();
            requestAnimationFrame(animate);
        }
    };
    animate();
}