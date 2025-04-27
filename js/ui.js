// Get references to UI elements (can be done once at the start)
const playerHandElement = document.getElementById('player-hand');
const opponentHandElement = document.getElementById('opponent-hand');
const playerGridElement = document.getElementById('player-grid');
const opponentGridElement = document.getElementById('opponent-grid');
const playerManaElement = document.getElementById('player-mana');
const playerMaxManaElement = document.getElementById('player-max-mana');
const opponentManaElement = document.getElementById('opponent-mana');
const opponentMaxManaElement = document.getElementById('opponent-max-mana');
const endTurnButton = document.getElementById('end-turn-button');
const messageAreaElement = document.getElementById('message-area');
const playerHpElement = document.getElementById('player-hp');
const opponentHpElement = document.getElementById('opponent-hp');
const opponentInfoElement = document.querySelector('#opponent-area .player-info'); // Get opponent info bar
// --- NEW References ---
const playerDeckCountElement = document.getElementById('player-deck-count');
const playerGraveCountElement = document.getElementById('player-grave-count');
const playerHandCountElement = document.getElementById('player-hand-count');
const opponentDeckCountElement = document.getElementById('opponent-deck-count');
const opponentGraveCountElement = document.getElementById('opponent-grave-count');
const opponentHandCountElement = document.getElementById('opponent-hand-count');
const graveyardModal = document.getElementById('graveyard-modal');
const graveyardCardsContainer = document.getElementById('graveyard-cards');
const graveyardTitleElement = document.getElementById('graveyard-title');
const closeGraveyardModalButton = document.getElementById('close-graveyard-modal');
const playerGraveyardButton = document.getElementById('player-graveyard-btn');
const opponentGraveyardButton = document.getElementById('opponent-graveyard-btn');
// --- End New References ---

// --- NEW: Damage Number Function ---
function showDamageNumber(amount, targetElement, isHealing = false) {
    if (!targetElement || amount === 0) return;

    const damageNumberElement = document.createElement('span');
    const value = Math.abs(amount);
    damageNumberElement.textContent = `${isHealing ? '+' : '-'}${value}`;
    damageNumberElement.classList.add('damage-number');
    if (isHealing) damageNumberElement.classList.add('healing');

    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;

    const targetRect = targetElement.getBoundingClientRect();
    const containerRect = gameContainer.getBoundingClientRect();

    // Position near the top-center of the target, relative to container
    const x = targetRect.left - containerRect.left + targetRect.width / 2;
    // Adjust Y position slightly higher to start above the element
    const y = targetRect.top - containerRect.top - 5;

    damageNumberElement.style.left = `${x}px`;
    damageNumberElement.style.top = `${y}px`;

    gameContainer.appendChild(damageNumberElement);

    // Trigger animation (CSS handles the movement/fade)
    requestAnimationFrame(() => {
         // Use a slight delay before starting the animation to ensure rendering
         setTimeout(() => {
            damageNumberElement.style.transform = `translate(-50%, -150%)`; // Move up
            damageNumberElement.style.opacity = '0';
         }, 10); // Small delay (10ms)
    });

    // Remove the element after animation (match CSS duration)
    setTimeout(() => {
        damageNumberElement.remove();
    }, 1000);
}

// --- NEW: Trigger Attack Animation ---
function triggerAttackAnimation(attackerCardElement, targetElement) {
    if (!attackerCardElement || !targetElement) return;

    const attackerRect = attackerCardElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();

    // Calculate rough direction vector (less important now, using simpler anim)
    // const dx = (targetRect.left + targetRect.width / 2) - (attackerRect.left + attackerRect.width / 2);
    const dy = (targetRect.top + targetRect.height / 2) - (attackerRect.top + attackerRect.height / 2);

    // Simple translation - just move slightly towards target y axis
    const translationY = Math.sign(dy) * 10; // Move 10px up or down

    // Quick lurch animation using CSS transition
    attackerCardElement.style.transition = 'transform 0.15s ease-out';
    attackerCardElement.style.transform = `translateY(${translationY}px) scale(1.02)`; // Move and slightly scale
    attackerCardElement.style.zIndex = '20'; // Bring attacker to front

    // Reset after a short delay
    setTimeout(() => {
        attackerCardElement.style.transition = 'transform 0.15s ease-in';
        attackerCardElement.style.transform = 'translate(0, 0) scale(1)'; // Return to normal
         // Reset z-index after return animation finishes
         setTimeout(() => {
             // Check if element still exists before resetting style
             if (document.body.contains(attackerCardElement)) {
                 attackerCardElement.style.zIndex = '';
             }
         }, 150);
    }, 150);
}

// --- NEW: Trigger Defeat Animation ---
function triggerDefeatAnimation(cardElement, callback) {
    if (!cardElement || !document.body.contains(cardElement)) {
         console.log("Defeat animation skipped: Element not found.");
         if(callback) requestAnimationFrame(callback); // Still call callback safely
         return;
    }
    console.log(`Triggering defeat for ${cardElement.dataset.instanceId}`);
    cardElement.classList.add('defeated');
    // Remove the element and call callback AFTER animation
    setTimeout(() => {
         console.log(`Removing defeated element ${cardElement.dataset.instanceId}`);
         cardElement?.remove(); // Remove element from DOM
         if (callback) callback(); // Execute state update
    }, 500); // MUST match CSS animation duration
}

// --- Art Rendering Function (Add New Shapes) ---
function renderGeneratedArt(canvas, artData) {
    if (!canvas || !artData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let W = rect.width; let H = rect.height;
    if (!W || W <= 0 || !H || H <= 0) { W = 60; H = 35; } // Fallback size

    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const centerX = W / 2; const centerY = H / 2;
    // Use baseRadius more as a general size guide now
    const baseSize = Math.min(W, H) * 0.35 * (artData.sizeModifier || 1);

    ctx.fillStyle = artData.baseColor || '#cccccc';
    ctx.strokeStyle = artData.secondaryColor || '#aaaaaa';
    ctx.lineWidth = 1;
    const thicknessMod = artData.shapeModifiers?.find(m => m.type === 'thickness');
    if (thicknessMod) ctx.lineWidth = Math.max(1, thicknessMod.value);

    // --- Draw Base Shape ---
    switch (artData.baseShape) {
        case 'circle':
            ctx.beginPath();
            ctx.arc(centerX, centerY, baseSize, 0, Math.PI * 2);
            break;
        case 'square':
            ctx.beginPath();
            const side = baseSize * 1.6;
            ctx.rect(centerX - side / 2, centerY - side / 2, side, side);
            break;
        case 'triangle':
            ctx.beginPath();
            const triH = baseSize * 1.5;
            ctx.moveTo(centerX, centerY - triH / 2);
            ctx.lineTo(centerX + triH * Math.sqrt(3) / 3, centerY + triH / 2);
            ctx.lineTo(centerX - triH * Math.sqrt(3) / 3, centerY + triH / 2);
            ctx.closePath();
            break;
        case 'hexagon':
            ctx.beginPath();
            const hexR = baseSize; const hexA = Math.PI / 3;
            ctx.moveTo(centerX + hexR, centerY);
            for (let i = 1; i <= 6; i++) { ctx.lineTo(centerX + hexR * Math.cos(hexA * i), centerY + hexR * Math.sin(hexA * i)); }
            ctx.closePath();
            break;

        // --- NEW SHAPES ---
        case 'blob':
            ctx.beginPath();
            const numPoints = 6 + Math.floor(Math.random() * 5);
            const points = [];
            for (let i = 0; i < numPoints; i++) {
                const angle = (i / numPoints) * Math.PI * 2;
                const radius = baseSize * (0.8 + Math.random() * 0.4);
                points.push({ x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) });
            }
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 0; i < numPoints; i++) {
                const p1 = points[i];
                const p2 = points[(i + 1) % numPoints];
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                const ctrlX = midX + (Math.random() - 0.5) * baseSize * 0.5;
                const ctrlY = midY + (Math.random() - 0.5) * baseSize * 0.5;
                ctx.quadraticCurveTo(ctrlX, ctrlY, p2.x, p2.y);
            }
            ctx.closePath();
            break;

        case 'biped':
            console.log('Drawing biped shape'); // Add log
            const headSize = baseSize * 0.4;
            const bodyH = baseSize * 0.8;
            const legH = baseSize * 0.6;
            const legW = baseSize * 0.2;
            const stance = baseSize * 0.3;

            ctx.beginPath(); // Path for head
            ctx.arc(centerX, centerY - bodyH / 2 - headSize / 2, headSize, 0, Math.PI * 2);
            ctx.fill(); // Fill head
            if (ctx.lineWidth > 0) ctx.stroke(); // Stroke head

            ctx.beginPath(); // Path for body
            ctx.rect(centerX - bodyH*0.2, centerY - bodyH/2, bodyH*0.4, bodyH);
            ctx.fill(); // Fill body
            if (ctx.lineWidth > 0) ctx.stroke(); // Stroke body

            ctx.beginPath(); // Path for legs
            ctx.rect(centerX - stance/2 - legW/2, centerY + bodyH/2, legW, legH); // Left leg
            ctx.rect(centerX + stance/2 - legW/2, centerY + bodyH/2, legW, legH); // Right leg
            ctx.fill(); // Fill legs
            if (ctx.lineWidth > 0) ctx.stroke(); // Stroke legs
            break;

        case 'eye':
             console.log('Drawing eye shape'); // Add log
             const eyeW = baseSize * 1.8; const eyeH = baseSize;
             ctx.beginPath(); // Outer shape path
             ctx.moveTo(centerX - eyeW / 2, centerY);
             ctx.quadraticCurveTo(centerX, centerY - eyeH, centerX + eyeW / 2, centerY);
             ctx.quadraticCurveTo(centerX, centerY + eyeH, centerX - eyeW / 2, centerY);
             ctx.closePath();
             // Fill outer shape first, then stroke for cleaner overlap with pupil
             ctx.fill();
             if (ctx.lineWidth > 0) ctx.stroke();

             ctx.beginPath(); // Pupil path
             ctx.arc(centerX, centerY, baseSize * 0.4, 0, Math.PI * 2);
             ctx.fillStyle = artData.secondaryColor; // Pupil color
             ctx.fill();
             // Optionally stroke pupil
             // ctx.strokeStyle = artData.baseColor; ctx.lineWidth = 0.5; ctx.stroke();
             ctx.fillStyle = artData.baseColor; // Reset fillStyle
             break;

        case 'flame':
             console.log('Drawing flame shape (Layered Design)');
             const flameW = baseSize * 1.3;
             const flameH = baseSize * 1.9;
             const layers = 3; // Draw 3 layers
             const baseLig = parseFloat(artData.baseColor.match(/,\s*([\d.]+)%\s*\)/)[1]); // Get base lightness

             for (let i = layers; i >= 1; i--) {
                 const scale = i / layers; // Scale factor for this layer
                 const layerH = flameH * scale;
                 const layerW = flameW * scale * (1 - (layers-i)*0.1); // Make inner layers narrower
                 const layerCenterY = centerY + (flameH - layerH) / 2; // Shift inner layers up slightly

                 // Slightly adjust color for inner layers (e.g., brighter) - Optional
                 const layerLig = Math.min(100, baseLig + (layers - i) * 8); // Make inner layers lighter
                 const layerColor = artData.baseColor.replace(/([\d.]+)%\s*\)/, `${layerLig.toFixed(2)}%)`);
                 ctx.fillStyle = layerColor;
                 // No stroke for inner layers usually looks better
                 // ctx.strokeStyle = layerColor;

                 ctx.beginPath(); // Begin path for this layer
                 ctx.moveTo(centerX, layerCenterY + layerH / 2); // Bottom center of layer
                 // Left curve
                 ctx.quadraticCurveTo(centerX - layerW * 0.6, layerCenterY + layerH * 0.1,
                                      centerX - layerW * 0.15, layerCenterY - layerH * 0.3);
                 // Tip
                 ctx.quadraticCurveTo(centerX, layerCenterY - layerH * 0.6,
                                      centerX, layerCenterY - layerH / 2);
                 // Right curve
                 ctx.quadraticCurveTo(centerX, layerCenterY - layerH * 0.6,
                                      centerX + layerW * 0.15, layerCenterY - layerH * 0.3);
                 // Back to bottom
                 ctx.quadraticCurveTo(centerX + layerW * 0.6, layerCenterY + layerH * 0.1,
                                      centerX, layerCenterY + layerH / 2);
                 ctx.closePath();
                 ctx.fill(); // Fill this layer
                 // if (i === layers && ctx.lineWidth > 0) ctx.stroke(); // Only stroke the outermost layer if desired
             }
             // Reset fillStyle if changed
             ctx.fillStyle = artData.baseColor;
            break;

        // --- END NEW SHAPES ---

        default:
            ctx.beginPath(); ctx.arc(centerX, centerY, baseSize, 0, Math.PI * 2); ctx.fill(); if(ctx.lineWidth > 0) ctx.stroke();
    }
    // Fill and stroke the main path (unless manually handled like 'eye')
    if (artData.baseShape !== 'eye' && artData.baseShape !== 'biped') { // Avoid double fill/stroke
        ctx.fill();
        if (ctx.lineWidth > 0) ctx.stroke();
    }

    // Draw spikes
    const spikesMod = artData.shapeModifiers?.find(m => m.type === 'spikes');
    if (spikesMod) {
        ctx.strokeStyle = artData.secondaryColor || '#aaaaaa';
        ctx.lineWidth = 1.5;
        const spikeCount = spikesMod.count;
        const spikeLength = baseSize * 0.3; // Use baseSize
        for (let i = 0; i < spikeCount; i++) {
            const angle = (Math.PI * 2 / spikeCount) * i;
            const startX = centerX + baseSize * Math.cos(angle); // Use baseSize
            const startY = centerY + baseSize * Math.sin(angle); // Use baseSize
            const endX = centerX + (baseSize + spikeLength) * Math.cos(angle); // Use baseSize
            const endY = centerY + (baseSize + spikeLength) * Math.sin(angle); // Use baseSize
            ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();
        }
    }

    // --- Draw Ability Icon ---
    if (artData.abilityIcon) {
        const iconSize = Math.min(W, H) * 0.25; // Make icon slightly larger
        const iconPadding = Math.min(W,H) * 0.05;
        const iconX = W - iconSize - iconPadding;
        const iconY = H - iconSize - iconPadding;

        ctx.save();
        // Center coordinate system on the icon's center for easier drawing
        ctx.translate(iconX + iconSize / 2, iconY + iconSize / 2);

        ctx.fillStyle = artData.secondaryColor || '#aaaaaa';
        ctx.strokeStyle = artData.baseColor || '#cccccc';
        ctx.lineWidth = Math.max(1, iconSize * 0.1); // Scale line width with icon size
        ctx.beginPath();

        // Use constants for icon drawing dimensions relative to iconSize
        const s = iconSize; // Alias for brevity

        switch (artData.abilityIcon) {
             case 'shield':
                 ctx.moveTo(-s*0.4, -s*0.5); ctx.lineTo( s*0.4, -s*0.5); // Top edge
                 ctx.bezierCurveTo(s*0.5, -s*0.4, s*0.5, s*0.3, 0, s*0.5); // Right curve to bottom point
                 ctx.bezierCurveTo(-s*0.5, s*0.3, -s*0.5, -s*0.4, -s*0.4, -s*0.5); // Left curve back to top
                 ctx.closePath(); break;
             case 'burst': // 4-point star/burst
                 ctx.moveTo(0, -s*0.5); ctx.lineTo(s*0.15, -s*0.15); ctx.lineTo(s*0.5, 0); ctx.lineTo(s*0.15, s*0.15);
                 ctx.lineTo(0, s*0.5); ctx.lineTo(-s*0.15, s*0.15); ctx.lineTo(-s*0.5, 0); ctx.lineTo(-s*0.15, -s*0.15);
                 ctx.closePath(); break;
            case 'plus': // Lifesteal/Heal Icon
                 const bW = s * 0.2, bL = s * 0.7; // Bar width/length
                 ctx.rect(-bW/2, -bL/2, bW, bL); // Vertical bar
                 ctx.moveTo(-bL/2, -bW/2); // Move context for horizontal bar (rect adds path)
                 ctx.rect(-bL/2, -bW/2, bL, bW); // Horizontal bar
                 break; // rect doesn't use closePath
            case 'arrow': // Rush Icon
                ctx.moveTo(-s*0.4, -s*0.2); ctx.lineTo( s*0.1, -s*0.2); // Shaft top
                ctx.lineTo( s*0.1, -s*0.4); ctx.lineTo( s*0.4,  0);    // Arrowhead point
                ctx.lineTo( s*0.1,  s*0.4); ctx.lineTo( s*0.1,  s*0.2); // Shaft bottom
                ctx.lineTo(-s*0.4,  s*0.2); ctx.closePath(); break;
            case 'sword': // BuffAttack Icon
                ctx.rect(-s*0.1, s*0.15, s*0.2, s*0.35); // Hilt (slightly longer)
                ctx.moveTo(-s*0.3, s*0.15); ctx.rect(-s*0.3, s*0.05, s*0.6, s*0.1); // Guard (moveTo before rect for clean path)
                ctx.moveTo(0, s*0.05); ctx.lineTo(-s*0.1, -s*0.4); // Blade
                ctx.lineTo(0, -s*0.5); ctx.lineTo(s*0.1, -s*0.4); ctx.closePath(); break;
            // --- NEW Icons ---
            case 'bubble': // Simple circle for Divine Shield
                 ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2); // Slightly smaller than bounds
                 ctx.closePath();
                 break;
            case 'skull': // Simple skull for Poisonous
                 // Top dome
                 ctx.arc(0, -s*0.15, s*0.35, Math.PI * 1.1, Math.PI * 1.9);
                 // Jaw line
                 ctx.lineTo(s*0.2, s*0.1); ctx.lineTo(s*0.3, s*0.35);
                 ctx.lineTo(-s*0.3, s*0.35); ctx.lineTo(-s*0.2, s*0.1);
                 ctx.closePath();
                 // Eyes (simple circles) - optional fill black later
                 // ctx.moveTo(-s*0.15, -s*0.1); ctx.arc(-s*0.15, -s*0.1, s*0.08, 0, Math.PI*2);
                 // ctx.moveTo(s*0.15, -s*0.1); ctx.arc(s*0.15, -s*0.1, s*0.08, 0, Math.PI*2);
                 break;
            // --- End New ---
        }
        ctx.fill();
        if (ctx.lineWidth > 0) ctx.stroke(); // Avoid stroke if line width is 0
        ctx.restore(); // Restore context translation/rotation etc.
    }
}

// --- NEW: Trigger Ability Flash ---
function triggerAbilityFlash(cardElement) {
    if (!cardElement || !document.body.contains(cardElement)) return;
    console.log(`Triggering flash for ${cardElement.dataset.instanceId}`);
    cardElement.classList.add('ability-trigger-flash');
    // Remove class after animation completes
    setTimeout(() => {
        cardElement?.classList.remove('ability-trigger-flash');
    }, 500); // Match CSS animation duration
}

// --- NEW: Animate Card Draw ---
// This will apply the animation class after the card is added to the DOM
function animateCardDraw(cardElement) {
    if (!cardElement) return;
    // Apply animation class - CSS handles the transition
    cardElement.classList.add('entering-hand');
    // No need to remove this class, it just defines the entry animation
}

// --- Card Rendering (Add title and state classes) ---
function createCardElement(cardData, isPlayerCard = true, isOnGrid = false, isEnteringHand = false) {
    const cardElement = document.createElement('div');
    cardElement.classList.add('card');
    if (cardData.instanceId) cardElement.dataset.instanceId = cardData.instanceId;
    else cardElement.dataset.cardId = cardData.id;
    cardElement.dataset.element = cardData.element || 'Neutral';

    let abilityText = cardData.ability ? `${cardData.ability.name}: ${cardData.ability.description}` : ''; // Get full text
    let displayHp = cardData.currentHp !== undefined ? cardData.currentHp : cardData.hp;

    const artContainerHTML = `<div class="card-art"><canvas class="generated-art-canvas" width="60" height="35"></canvas></div>`;

    if (isOnGrid) {
        cardElement.classList.add('on-grid');
        cardElement.innerHTML = `
            ${artContainerHTML}
            <div class="card-info-column">
                <div class="card-header-grid"><span class="card-name" title="${cardData.name}">${cardData.name}</span></div>
                <div class="card-stats"><span class="card-atk" title="Attack">${cardData.atk}</span><span class="card-hp" title="Health">${displayHp}</span></div>
                <div class="card-ability" title="${abilityText}"></div>
            </div>
            <div class="indicators-container"></div>
            `; // Added indicators-container

        // --- Add Tooltip (Title Attribute) ---
        let tooltipText = `${cardData.name} (${cardData.atk}/${displayHp})`;
        if (abilityText) {
            tooltipText += `\n${abilityText}`; // Add ability text on new line
        }
        cardElement.title = tooltipText; // Set title for browser tooltip

        // Apply base state classes (like damaged)
        cardElement.classList.toggle('damaged', cardData.currentHp !== undefined && cardData.currentHp < cardData.hp);

        // --- Add Indicator Icons ---
        const indicatorsContainer = cardElement.querySelector('.indicators-container');
        if (indicatorsContainer) {
            const isExhausted = !cardData.canAttack || cardData.hasAttacked;
             // Exhausted / Cannot Attack Indicator (Show if exhausted)
             if (isExhausted) {
                 const exhaustedIcon = document.createElement('div');
                 exhaustedIcon.classList.add('state-indicator', 'indicator-exhausted');
                 exhaustedIcon.title = "Cannot attack this turn"; // Tooltip for the icon
                 indicatorsContainer.appendChild(exhaustedIcon);
             }

            // Taunt Indicator
            if (cardData.ability?.effect === 'taunt') {
                 const tauntIcon = document.createElement('div');
                 tauntIcon.classList.add('state-indicator', 'indicator-taunt');
                 tauntIcon.title = "Taunt";
                 indicatorsContainer.appendChild(tauntIcon);
            }
            // Divine Shield Indicator (only if flag is true)
            if (cardData.hasDivineShield === true) {
                  const dsIcon = document.createElement('div');
                 dsIcon.classList.add('state-indicator', 'indicator-divine-shield');
                 dsIcon.title = "Divine Shield";
                 indicatorsContainer.appendChild(dsIcon);
            }
            // Poisonous Indicator
            if (cardData.ability?.effect === 'poisonous') {
                 const poisonIcon = document.createElement('div');
                 poisonIcon.classList.add('state-indicator', 'indicator-poisonous');
                 poisonIcon.title = "Poisonous";
                 indicatorsContainer.appendChild(poisonIcon);
            }
             // Add other indicators similarly...
        }
         // Apply CSS classes for visual styling based on flags (borders/glows remain)
        cardElement.classList.toggle('has-taunt', !!cardData.ability && cardData.ability.effect === 'taunt');
        cardElement.classList.toggle('has-divine-shield', cardData.hasDivineShield === true);
        cardElement.classList.toggle('has-poisonous', cardData.ability?.effect === 'poisonous');
        cardElement.classList.toggle('is-exhausted', !cardData.canAttack || cardData.hasAttacked);
        cardElement.classList.toggle('can-attack', cardData.canAttack && !cardData.hasAttacked);

    } else { // Hand Layout
        cardElement.classList.remove('on-grid');
        cardElement.innerHTML = `
            <div class="card-header"><span class="card-name">${cardData.name}</span><span class="card-cost">${cardData.manaCost}</span></div>
            ${artContainerHTML}
            <div class="card-stats"><span class="card-atk" title="Attack">${cardData.atk}</span><span class="card-hp" title="Health">${displayHp}</span></div>
            <div class="card-ability" title="${abilityText}">${abilityText}</div>`;
         // Add title attribute for hand cards too? Optional.
        cardElement.title = `${cardData.name} - ${cardData.manaCost} Mana\n${cardData.atk} ATK / ${displayHp} HP\n${abilityText || 'No ability'}`;
        if (isEnteringHand) {
            cardElement.classList.add('entering-hand');
        }
    }

    // Render the generated art onto the canvas
    const canvas = cardElement.querySelector('.generated-art-canvas');
    if (canvas && cardData.artData) {
         requestAnimationFrame(() => {
             if (document.body.contains(canvas)) {
                 renderGeneratedArt(canvas, cardData.artData);
             }
         });
    } else if (canvas) { // Fallback placeholder drawing
         requestAnimationFrame(() => {
             if (document.body.contains(canvas)) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                     const w = canvas.width; // Use canvas internal size
                     const h = canvas.height;
                     ctx.fillStyle = '#ddd'; ctx.fillRect(0, 0, w, h);
                     ctx.fillStyle = '#999'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                     ctx.font = `${Math.min(w, h) * 0.6}px sans-serif`;
                     ctx.fillText('?', w/2, h/2);
                }
             }
         });
    }

    return cardElement;
}

// --- Hand Rendering (Pass draw animation flag) ---
function displayHand(hand, handElement, isPlayer = true, newlyDrawnInstanceId = null) { // Added newlyDrawnInstanceId
    // Store current scroll position
    const scrollPos = handElement.scrollLeft;

    const fragment = document.createDocumentFragment(); // Use fragment for performance
    if (isPlayer) {
        hand.forEach(card => {
            // Check if this card was the one just drawn
            const isEntering = card.instanceId === newlyDrawnInstanceId;
            const cardElement = createCardElement(card, true, false, isEntering); // Pass flag
            fragment.appendChild(cardElement);
        });
    } else { // Opponent hand - show backs
        for (let i = 0; i < hand.length; i++) {
             const cardBack = document.createElement('div');
             cardBack.classList.add('card', 'card-back');
             // Check if this *position* corresponds to a newly drawn card for opponent
             // This is harder as we don't see opponent cards. For now, no draw anim for opponent.
             // Could potentially animate the last card back added?
             fragment.appendChild(cardBack);
        }
    }

    handElement.innerHTML = ''; // Clear existing content
    handElement.appendChild(fragment); // Add new content

    // Restore scroll position
    handElement.scrollLeft = scrollPos;

    // If a card was newly drawn, scroll it into view (optional)
    if (newlyDrawnInstanceId && isPlayer) {
        const newCardElement = handElement.querySelector(`.card[data-instance-id="${newlyDrawnInstanceId}"]`);
        newCardElement?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    }
}

// --- Grid Rendering ---
function displayGrid(gridData, gridElement, isPlayerGrid = true) {
    gridElement.innerHTML = ''; // Clear previous grid
    const gridRow = gridData[0];

    for (let c = 0; c < 5; c++) {
        const slot = document.createElement('div');
        slot.classList.add('grid-slot');
        slot.dataset.col = c;

        const monsterInstance = gridRow[c];
        if (monsterInstance) {
            const cardElement = createCardElement(monsterInstance, isPlayerGrid, true);
            slot.appendChild(cardElement);
        }
        gridElement.appendChild(slot);
    }
}


// --- Update Player Info (Add Counts) ---
function updatePlayerInfo(playerState) {
    if (!playerManaElement || !playerMaxManaElement || !playerHpElement) return;
    playerManaElement.textContent = playerState.mana;
    playerMaxManaElement.textContent = playerState.maxMana;
    playerHpElement.textContent = playerState.hp;
    // --- Add Counts ---
    if(playerDeckCountElement) playerDeckCountElement.textContent = playerState.deck.length;
    if(playerGraveCountElement) playerGraveCountElement.textContent = playerState.graveyard.length;
    if(playerHandCountElement) playerHandCountElement.textContent = playerState.hand.length;
}

// --- Update Opponent Info (Add Counts) ---
function updateOpponentInfo(opponentState) {
    if (!opponentManaElement || !opponentMaxManaElement || !opponentHpElement) return;
    opponentManaElement.textContent = opponentState.mana;
    opponentMaxManaElement.textContent = opponentState.maxMana;
    opponentHpElement.textContent = opponentState.hp;
     // --- Add Counts ---
    if(opponentDeckCountElement) opponentDeckCountElement.textContent = opponentState.deck.length;
    if(opponentGraveCountElement) opponentGraveCountElement.textContent = opponentState.graveyard.length;
    if(opponentHandCountElement) opponentHandCountElement.textContent = opponentState.hand.length; // This usually matches card backs
}

// --- Update Turn Button ---
function updateTurnButton(isPlayerTurn) {
    if (!endTurnButton) return;
    endTurnButton.disabled = !isPlayerTurn || gameState.gameOver;
    endTurnButton.textContent = isPlayerTurn ? "End Turn" : "Opponent's Turn";
}

// --- Show Messages ---
let messageTimeout = null;
function showMessage(message, duration = 3000) {
    if (!messageAreaElement) return;

    if (messageTimeout) clearTimeout(messageTimeout);

    messageAreaElement.textContent = message;
    messageAreaElement.style.display = 'block';
    void messageAreaElement.offsetWidth; // Force reflow
    messageAreaElement.style.opacity = '1';

    if (duration > 0) {
        messageTimeout = setTimeout(() => {
            messageAreaElement.style.opacity = '0';
             setTimeout(() => {
                 if (messageAreaElement.style.opacity === '0') {
                    messageAreaElement.style.display = 'none';
                 }
             }, 300); // Match CSS transition
             messageTimeout = null;
        }, duration);
    }
}

// --- Highlight Playable Cards ---
function highlightPlayableCards(hand, currentMana) {
    if (!playerHandElement) return;
    const cardElements = playerHandElement.querySelectorAll('.card:not(.card-back)');
    cardElements.forEach(cardElement => {
        const cardInHand = hand.find(c => c.instanceId === cardElement.dataset.instanceId);
        // Check if cardInHand exists before accessing manaCost
        cardElement.classList.toggle('playable', !!cardInHand && currentMana >= cardInHand.manaCost);
    });
}

// --- Highlight Grid Slots ---
function highlightGridSlots(show = true) {
    if (!playerGridElement) return;
    const slots = playerGridElement.querySelectorAll('.grid-slot');
    slots.forEach((slot, index) => {
        const isEmpty = !gameState.player.grid[0][index];
        slot.classList.toggle('valid-summon-target', show && isEmpty);
    });
}

// --- Attack Highlighting ---
function highlightValidTargets(targetCoords) {
    if (!opponentGridElement || !opponentHpElement || !opponentInfoElement) return;

    let heroTargetable = false;
    targetCoords.forEach(coord => {
        if (coord.c !== undefined) {
            const targetSlot = opponentGridElement.children[coord.c];
            if (targetSlot && targetSlot.querySelector('.card')) { // Check for card presence
                targetSlot.classList.add('valid-attack-target');
            }
        } else if (coord.type === 'hero') {
            heroTargetable = true;
        }
    });

    opponentHpElement.classList.toggle('valid-hero-target', heroTargetable);
    opponentInfoElement.classList.toggle('valid-hero-target-area', heroTargetable);
}

// --- Remove Highlights ---
function removeAttackHighlights() {
    playerGridElement?.querySelectorAll('.selected-attacker').forEach(el => el.classList.remove('selected-attacker'));
    playerGridElement?.querySelectorAll('.valid-summon-target').forEach(el => el.classList.remove('valid-summon-target'));
    opponentGridElement?.querySelectorAll('.valid-attack-target').forEach(el => el.classList.remove('valid-attack-target'));
    opponentHpElement?.classList.remove('valid-hero-target');
    opponentInfoElement?.classList.remove('valid-hero-target-area');
    playerHandElement?.querySelectorAll('.card.selected').forEach(c => c.classList.remove('selected'));
}

// --- NEW: Display Graveyard Function ---
function displayGraveyard(playerState, title) {
    if (!graveyardModal || !graveyardCardsContainer || !graveyardTitleElement) return;

    graveyardTitleElement.textContent = title;
    graveyardCardsContainer.innerHTML = ''; // Clear previous cards

    if (playerState.graveyard.length === 0) {
        graveyardCardsContainer.innerHTML = '<p style="text-align: center; color: #666;">Graveyard is empty.</p>';
    } else {
        // Render cards similar to hand, but maybe non-interactive
        playerState.graveyard.forEach(cardData => {
            // Create card element (force non-player view maybe, or use default hand view)
            const cardElement = createCardElement(cardData, false, false); // Treat as non-player, hand layout
            cardElement.style.cursor = 'default'; // Not interactive
            cardElement.classList.remove('playable'); // Ensure not marked playable
            graveyardCardsContainer.appendChild(cardElement);
        });
    }

    graveyardModal.style.display = 'flex'; // Show modal (use flex for centering)
}

// --- updateUI function (Pass newly drawn card ID) ---
function updateUI(newlyDrawnCardInfo = null) { // { owner: 'player'/'ai', instanceId: id }
    if (!playerHandElement || !playerGridElement || !opponentHandElement || !opponentGridElement) { return; }

    removeAttackHighlights();
    highlightGridSlots(false);

    // Render main areas, passing newly drawn ID to player hand render
    const playerNewlyDrawnId = (newlyDrawnCardInfo?.owner === 'player') ? newlyDrawnCardInfo.instanceId : null;
    const aiNewlyDrawnId = (newlyDrawnCardInfo?.owner === 'ai') ? newlyDrawnCardInfo.instanceId : null; // Not used for animation yet

    displayHand(gameState.player.hand, playerHandElement, true, playerNewlyDrawnId); // Pass ID
    displayGrid(gameState.player.grid, playerGridElement, true);
    updatePlayerInfo(gameState.player);

    displayHand(gameState.ai.hand, opponentHandElement, false); // Opponent anim TBD
    displayGrid(gameState.ai.grid, opponentGridElement, false);
    updateOpponentInfo(gameState.ai);

    // Re-apply active highlights
    if (gameState.turn === 'player' && !gameState.gameOver) {
        highlightPlayableCards(gameState.player.hand, gameState.player.mana);

        if (gameState.selectedAttacker) {
             const attackerCardElement = playerGridElement.querySelector(`.card[data-instance-id="${gameState.selectedAttacker.instance.instanceId}"]`);
             attackerCardElement?.classList.add('selected-attacker');
             highlightValidTargets(getValidTargets(gameState.selectedAttacker));
        }
        else if (gameState.selectedCard) {
            const selectedHandCardElement = playerHandElement.querySelector(`.card[data-instance-id="${gameState.selectedCard.instanceId}"]`);
            selectedHandCardElement?.classList.add('selected');
            highlightGridSlots(true); // Show summon targets
        }
    }

    updateTurnButton(gameState.turn === 'player');
}

// --- Initial Setup for Modal ---
if (closeGraveyardModalButton && graveyardModal) {
    closeGraveyardModalButton.onclick = () => {
        graveyardModal.style.display = 'none';
    };
}
// Close modal if clicking outside the content
if (graveyardModal) {
    graveyardModal.onclick = (event) => {
        if (event.target === graveyardModal) { // Check if click was on the backdrop
             graveyardModal.style.display = 'none';
        }
    };
}