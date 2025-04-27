// --- Game State ---
let gameState = {
    player: {
        hp: 30, deck: [], hand: [], grid: [[null, null, null, null, null]], graveyard: [], mana: 1, maxMana: 1
    },
    ai: {
        hp: 30, deck: [], hand: [], grid: [[null, null, null, null, null]], graveyard: [], mana: 0, maxMana: 0
    },
    turn: 'player', turnNumber: 1, activeEffects: [], selectedCard: null, selectedAttacker: null, instanceCounter: 0, gameOver: false
};
let windowListenersInitialized = false; // Move this out to global scope within the file

// --- Add Menu Element References ---
const startMenu = document.getElementById('start-menu');
const startGameButton = document.getElementById('start-game-button');
const gameOverMenu = document.getElementById('game-over-menu');
const gameOverMessageElement = document.getElementById('game-over-message');
const playAgainButton = document.getElementById('play-again-button');
const gameContainer = document.getElementById('game-container'); // Reference main container

// --- Utility Functions ---
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// --- Draw Card (Track newly drawn card) ---
function drawCard(playerState, ownerLabel = 'Player') {
    let newlyDrawnInstanceId = null; // Track ID of the drawn card
    if (playerState.deck.length > 0) {
        const drawnMonsterBaseObject = playerState.deck.pop();
        const prefix = (ownerLabel === 'AI') ? 'a' : 'p';
        const cardInstance = JSON.parse(JSON.stringify(drawnMonsterBaseObject));

        cardInstance.instanceId = `${prefix}${gameState.instanceCounter++}`;
        newlyDrawnInstanceId = cardInstance.instanceId; // Store the ID
        cardInstance.currentHp = cardInstance.hp;
        cardInstance.hasAttacked = false;
        cardInstance.canAttack = true;
        cardInstance.effects = cardInstance.effects || [];

        if (playerState.hand.length < 7) {
            playerState.hand.push(cardInstance);
            console.log(`${ownerLabel} drew ${cardInstance.name}. Hand: ${playerState.hand.length}`);
        } else {
            console.log(`${ownerLabel} hand full, card ${cardInstance.name} burned.`);
            playerState.graveyard.push(cardInstance);
            newlyDrawnInstanceId = null; // Card was burned, not added to hand
        }
    } else {
        console.log(`${ownerLabel} deck empty!`);
        // TODO: Fatigue damage
    }
    // Return info about the drawn card for UI update
    return newlyDrawnInstanceId ? { owner: ownerLabel.toLowerCase(), instanceId: newlyDrawnInstanceId } : null;
}

// --- Ability Handling (Trigger Flash) ---
function applyAbility(sourceCard, sourcePos, sourceOwnerState, opponentState) {
    if (!sourceCard || !sourceCard.ability || !sourceCard.instanceId) return;
    const ability = sourceCard.ability;
    const effect = ability.effect;
    const value = ability.value;
    console.log(`Applying ability "${ability.name}" from ${sourceCard.name}`);

    let sourceElement = document.querySelector(`.card[data-instance-id="${sourceCard.instanceId}"]`);
    let targetElement = null; // Find target element if applicable

    switch (effect) {
        case 'healSelf':
            sourceCard.currentHp += value;
            showMessage(`${sourceCard.name} heals +${value} HP!`, 2000);
             triggerAbilityFlash(sourceElement); // Flash self
             showDamageNumber(value, sourceElement, true);
            break;
        case 'directOpponentDamage':
            opponentState.hp -= value;
            showMessage(`${sourceCard.name} deals ${value} dmg to opponent!`, 2000);
             triggerAbilityFlash(sourceElement); // Flash self
             const opponentHpElement = (sourceOwnerState === gameState.player) ? document.getElementById('opponent-hp') : document.getElementById('player-hp');
             showDamageNumber(value, opponentHpElement?.parentElement);
            break;
        case 'buffAttack':
            sourceCard.atk += value;
            showMessage(`${sourceCard.name} gains +${value} Attack!`, 2000);
             triggerAbilityFlash(sourceElement); // Flash self
            break;

        // Effects handled elsewhere or passive
        case 'directDamage': case 'adjacentDamage': case 'taunt': case 'rush': case 'lifesteal':
             console.log(`(${ability.type} ability "${ability.name}" has no immediate effect on summon).`);
             break;
        default:
            console.warn(`Unknown ability effect: ${effect}`);
    }
    // updateUI is called by the calling function (summon logic)
}

// --- NEW: Helper Function for Elemental Modifier ---
function getElementalModifier(attackerElement, defenderElement) {
    if (!attackerElement || !defenderElement || attackerElement === 'Neutral' || defenderElement === 'Neutral') {
        return 0; // No bonus for or against Neutral
    }
    if (attackerElement === defenderElement) {
        return 0; // No bonus for same element
    }

    // Define Advantage Triangle
    if (
        (attackerElement === 'Fire' && defenderElement === 'Earth') ||
        (attackerElement === 'Earth' && defenderElement === 'Water') ||
        (attackerElement === 'Water' && defenderElement === 'Fire')
    ) {
        return 1; // +1 Damage Bonus
    }

    // No disadvantage implemented in this version, but could add it here:
    // else if (
    //     (attackerElement === 'Fire' && defenderElement === 'Water') ||
    //     (attackerElement === 'Earth' && defenderElement === 'Fire') ||
    //     (attackerElement === 'Water' && defenderElement === 'Earth')
    // ) {
    //     return -1; // -1 Damage Penalty (Optional)
    // }

    return 0; // Default: No bonus or penalty
}

// --- Attack Logic (Integrated Visuals) ---
function executeAttack(attackerInfo, targetInfo) {
    if (gameState.gameOver || !attackerInfo || !attackerInfo.instance) return;

    const attacker = attackerInfo.instance;
    const attackerOwnerLabel = attackerInfo.instance.instanceId.startsWith('p') ? 'player' : 'ai';
    const attackerOwnerState = (attackerOwnerLabel === 'player') ? gameState.player : gameState.ai;
    const targetOwnerState = (attackerOwnerLabel === 'player') ? gameState.ai : gameState.player;

    // Find Elements for Animation
    const attackerElement = document.querySelector(`.card[data-instance-id="${attacker.instanceId}"]`);
    let targetElement = null;
    let totalDamageDealtByAttacker = 0; // For Lifesteal calculation
    let attackerIsPoisonous = attacker.ability?.effect === 'poisonous'; // Check attacker ability

    // --- Target is a Monster ---
    if (targetInfo.instance) {
        const target = targetInfo.instance;
        targetElement = document.querySelector(`.card[data-instance-id="${target.instanceId}"]`);

        if (!targetOwnerState.grid[0][targetInfo.c] || targetOwnerState.grid[0][targetInfo.c].instanceId !== target.instanceId || !targetElement) {
             console.warn(`Attack cancelled: Target missing.`);
             attacker.hasAttacked = true; attacker.canAttack = false;
             if (gameState.turn === 'player') gameState.selectedAttacker = null;
             updateUI(); return;
        }

        console.log(`${attacker.name} ${attackerIsPoisonous ? '(P)' : ''} attacks ${target.name} ${target.hasDivineShield ? '(DS)' : ''}`);
        triggerAttackAnimation(attackerElement, targetElement);

        setTimeout(() => {
            if (gameState.gameOver) return;

            const currentAttacker = attackerOwnerState.grid[0][attackerInfo.c];
            const currentTarget = targetOwnerState.grid[0][targetInfo.c];

            if (!currentAttacker || !currentTarget || currentTarget.instanceId !== target.instanceId) {
                console.warn("Combatants disappeared during attack delay.");
                updateUI(); checkWinCondition(); return;
            }

            let attackerSurvived = true;
            let targetSurvived = true;
            let damagePreventedByShield = false; // Flag for shield interaction

            // --- Resolve ON_ATTACK Abilities ---
            if (currentAttacker.ability?.type === 'onAttack') {
                triggerAbilityFlash(attackerElement);
                const atkAbility = currentAttacker.ability;
                let abilityDamage = 0;
                if (atkAbility.effect === 'directDamage' && currentTarget.currentHp > 0) {
                    let abilityDamage = atkAbility.value;
                    currentTarget.currentHp -= abilityDamage;
                    totalDamageDealtByAttacker += abilityDamage;
                    showMessage(`${currentAttacker.name}'s ${atkAbility.name} deals ${abilityDamage} extra!`, 1500);
                    showDamageNumber(abilityDamage, targetElement);
                    console.log(`${currentTarget.name} takes ability damage, HP: ${currentTarget.currentHp}`);
                 }
                 // Handle adjacent damage
                 if (atkAbility.effect === 'adjacentDamage') {
                    const opponentGrid = targetOwnerState.grid[0];
                    const targetCol = targetInfo.c;
                    const value = atkAbility.value;
                    // Left
                    if (targetCol > 0 && opponentGrid[targetCol - 1]) {
                        const leftN = opponentGrid[targetCol - 1];
                        leftN.currentHp -= value; showMessage(`${currentAttacker.name}'s ${atkAbility.name} hits ${leftN.name} (L)!`, 1500);
                        const leftEl = document.querySelector(`.card[data-instance-id="${leftN.instanceId}"]`);
                        showDamageNumber(value, leftEl);
                        if (leftN.currentHp <= 0) handleMonsterDefeat(leftN, targetCol - 1, targetOwnerState);
                    }
                    // Right
                     if (targetCol < 4 && opponentGrid[targetCol + 1]) {
                         const rightN = opponentGrid[targetCol + 1];
                         rightN.currentHp -= value; showMessage(`${currentAttacker.name}'s ${atkAbility.name} hits ${rightN.name} (R)!`, 1500);
                         const rightEl = document.querySelector(`.card[data-instance-id="${rightN.instanceId}"]`);
                         showDamageNumber(value, rightEl);
                         if (rightN.currentHp <= 0) handleMonsterDefeat(rightN, targetCol + 1, targetOwnerState);
                     }
                 }

                 if (abilityDamage > 0) {
                    // --- Check Target Divine Shield (for Ability Damage) ---
                    if (currentTarget.hasDivineShield) {
                        currentTarget.hasDivineShield = false; // Shield popped
                        showMessage(`${currentTarget.name}'s Divine Shield blocks ability damage!`, 1500);
                        damagePreventedByShield = true;
                         // Trigger visual shield pop? (Could add a class temporarily)
                         targetElement?.classList.add('shield-pop');
                         setTimeout(() => targetElement?.classList.remove('shield-pop'), 300);
                    } else {
                        currentTarget.currentHp -= abilityDamage;
                        // Only count damage if shield didn't block it, for lifesteal
                        if (!damagePreventedByShield) totalDamageDealtByAttacker += abilityDamage;
                        showMessage(`${currentAttacker.name}'s ${atkAbility.name} deals ${abilityDamage} extra!`, 1500);
                        showDamageNumber(abilityDamage, targetElement);
                        console.log(`${currentTarget.name} takes ability damage, HP: ${currentTarget.currentHp}`);
                        // --- Check Poisonous from Ability Damage ---
                        if (attackerIsPoisonous && !damagePreventedByShield && currentTarget.currentHp > 0) {
                             showMessage(`${currentAttacker.name}'s Poison destroys ${currentTarget.name}!`, 1500);
                             currentTarget.currentHp = 0; // Destroy
                         }
                         // --- End Poisonous Check ---
                    }
                     // --- End Divine Shield Check ---
                }
            }

            // Check defeat from ability BEFORE main combat damage
             if (currentTarget.currentHp <= 0) {
                 targetSurvived = false;
                 handleMonsterDefeat(currentTarget, targetInfo.c, targetOwnerState);
             }

             // --- Resolve Main Combat Damage (if target survived ability) ---
            if (targetSurvived) {
                let damageToTarget = 0; // Start at 0
                // Check Target Divine Shield (for Attack Damage)
                if (currentTarget.hasDivineShield) {
                    currentTarget.hasDivineShield = false; // Pop shield
                    showMessage(`${currentTarget.name}'s Divine Shield blocks the attack!`, 1500);
                    damagePreventedByShield = true;
                    targetElement?.classList.add('shield-pop');
                    setTimeout(() => targetElement?.classList.remove('shield-pop'), 300);
                } else {
                    // Calculate base damage + elemental
                    const attackModifier = getElementalModifier(currentAttacker.element, currentTarget.element);
                    damageToTarget = Math.max(0, currentAttacker.atk + attackModifier);
                    if (attackModifier > 0) showMessage(`Elemental Bonus! (+${attackModifier} Damage)`, 1200);

                    currentTarget.currentHp -= damageToTarget;
                    totalDamageDealtByAttacker += damageToTarget; // Only add if not shielded
                    showDamageNumber(damageToTarget, targetElement);
                    console.log(`${currentTarget.name} takes ${damageToTarget} attack damage, HP: ${currentTarget.currentHp}`);

                    // --- Check Poisonous from Attack Damage ---
                    if (attackerIsPoisonous && damageToTarget > 0 && currentTarget.currentHp > 0) { // Check HP > 0 before poison kills
                         showMessage(`${currentAttacker.name}'s Poison destroys ${currentTarget.name}!`, 1500);
                         currentTarget.currentHp = 0; // Destroy
                     }
                     // --- End Poisonous Check ---
                }

                // Check defeat from main attack/poison
                 if (currentTarget.currentHp <= 0) {
                     targetSurvived = false;
                     handleMonsterDefeat(currentTarget, targetInfo.c, targetOwnerState);
                 }

                 // --- Apply Retaliation Damage ---
                 // Check if attacker still exists and target survived main hit
                 if (currentAttacker.currentHp > 0 && targetSurvived) {
                      let damageToAttacker = 0;
                      // Check Attacker Divine Shield
                      if (currentAttacker.hasDivineShield) {
                          currentAttacker.hasDivineShield = false; // Pop shield
                          showMessage(`${currentAttacker.name}'s Divine Shield blocks retaliation!`, 1500);
                           attackerElement?.classList.add('shield-pop');
                           setTimeout(() => attackerElement?.classList.remove('shield-pop'), 300);
                      } else {
                          const retaliationModifier = getElementalModifier(currentTarget.element, currentAttacker.element);
                          damageToAttacker = Math.max(0, currentTarget.atk + retaliationModifier);
                          if (retaliationModifier > 0) showMessage(`Retaliation Elemental Bonus! (+${retaliationModifier} Damage)`, 1200);

                          currentAttacker.currentHp -= damageToAttacker;
                          showDamageNumber(damageToAttacker, attackerElement);
                          console.log(`${currentAttacker.name} takes ${damageToAttacker} retaliation, HP: ${currentAttacker.currentHp}`);

                          // --- Check Poisonous from Retaliation (if target is poisonous) ---
                          const targetIsPoisonous = currentTarget.ability?.effect === 'poisonous';
                          if (targetIsPoisonous && damageToAttacker > 0 && currentAttacker.currentHp > 0) {
                               showMessage(`${currentTarget.name}'s Poison destroys ${currentAttacker.name}!`, 1500);
                               currentAttacker.currentHp = 0; // Destroy attacker
                           }
                           // --- End Poisonous Check ---
                      }

                     // Check attacker defeat from retaliation/poison
                      if (currentAttacker.currentHp <= 0) {
                          attackerSurvived = false;
                          handleMonsterDefeat(currentAttacker, attackerInfo.c, attackerOwnerState);
                      }
                 }
             } // End targetSurvived block

            // --- Resolve Lifesteal (if attacker survived) ---
            if (attackerSurvived && currentAttacker.ability?.effect === 'lifesteal' && totalDamageDealtByAttacker > 0) {
                triggerAbilityFlash(attackerElement);
                const healAmount = totalDamageDealtByAttacker;
                attackerOwnerState.hp += healAmount;
                showMessage(`${currentAttacker.name}'s Lifesteal heals ${attackerOwnerLabel} for ${healAmount} HP!`, 2000);
                const heroHpElement = (attackerOwnerLabel === 'player') ? playerHpElement : opponentHpElement;
                showDamageNumber(healAmount, heroHpElement?.parentElement, true); // Show heal number
             }

            // --- Update Attacker State & UI ---
            if (attackerSurvived) { currentAttacker.hasAttacked = true; currentAttacker.canAttack = false; }
            if (gameState.turn === 'player') gameState.selectedAttacker = null;
            updateUI(); // Update after all damage/effects/deaths are processed
            checkWinCondition();

        }, 150); // Delay for animation

    }
    // --- Target is the Hero ---
    else if (targetInfo.type === 'hero') {
        const heroTargetLabel = (attackerOwnerLabel === 'player') ? 'Opponent' : 'Player';
        targetElement = (heroTargetLabel === 'Player') ? playerHpElement?.parentElement : opponentHpElement?.parentElement;

        console.log(`${attacker.name} attacks the ${heroTargetLabel} hero!`);
        triggerAttackAnimation(attackerElement, targetElement); // Start animation

        setTimeout(() => {
            if (gameState.gameOver) return;
            const currentAttacker = attackerOwnerState.grid[0][attackerInfo.c]; // Re-fetch
            if (!currentAttacker || currentAttacker.instanceId !== attacker.instanceId) return;

            let damageToHero = Math.max(0, currentAttacker.atk);
            targetOwnerState.hp -= damageToHero;
            totalDamageDealtByAttacker += damageToHero;
            showDamageNumber(damageToHero, targetElement); // Show damage on hero info
            console.log(`${heroTargetLabel} HP: ${targetOwnerState.hp}`);

            let attackerSurvived = true; // Hero doesn't retaliate

            // Resolve Lifesteal
            if (attackerSurvived && currentAttacker.ability?.effect === 'lifesteal' && totalDamageDealtByAttacker > 0) {
                 const healAmount = totalDamageDealtByAttacker;
                 attackerOwnerState.hp += healAmount;
                 showMessage(`${currentAttacker.name}'s Lifesteal heals ${attackerOwnerLabel} for ${healAmount} HP!`, 2000);
                 const heroHpElement = (attackerOwnerLabel === 'player') ? playerHpElement : opponentHpElement;
                 showDamageNumber(healAmount, heroHpElement?.parentElement, true);
             }

            // Update Attacker State & UI
            currentAttacker.hasAttacked = true; currentAttacker.canAttack = false;
            if (gameState.turn === 'player') gameState.selectedAttacker = null;
            updateUI();
            checkWinCondition();

        }, 150); // Delay for animation
    }
}


// --- Handle Monster Defeat (Trigger Animation First) ---
function handleMonsterDefeat(defeatedMonster, c, ownerState) {
    // Check if monster actually exists at that location in the state
    if (!ownerState.grid[0][c] || ownerState.grid[0][c].instanceId !== defeatedMonster.instanceId) {
        // console.log(`Defeat check for missing/mismatched monster at [${c}] averted.`);
        return; // Already handled or gone
    }
    const instanceId = defeatedMonster.instanceId; // Store ID before potential state changes
    console.log(`${defeatedMonster.name} (ID: ${instanceId}) starting defeat process at [${c}]...`);

    // Find the element to animate
    const gridElement = (ownerState === gameState.player) ? playerGridElement : opponentGridElement;
    const cardElement = gridElement?.querySelector(`.card[data-instance-id="${instanceId}"]`);

    // Trigger animation, and update state *after* animation time
    triggerDefeatAnimation(cardElement, () => {
        // Check state *again* inside the callback, in case something else removed it
        if (!ownerState.grid[0][c] || ownerState.grid[0][c].instanceId !== instanceId) {
            // console.log(`Monster ${instanceId} already gone when defeat animation finished.`);
            return;
        }
        console.log(`Completing defeat state update for ${instanceId}`);
        // TODO: Trigger 'onDeath' effects here
        ownerState.graveyard.push(ownerState.grid[0][c]); // Push the latest state to graveyard
        ownerState.grid[0][c] = null; // Remove from grid state
        // Don't call updateUI() here, let the main sequence (e.g. end of attack) handle it
    });
}

// --- Targeting Logic (MODIFIED to include hero if no taunt) ---
function getValidTargets(attackerInfo) {
    const validTargets = [];
    const attackerOwnerLabel = attackerInfo.instance.instanceId.startsWith('p') ? 'player' : 'ai';
    const opponentState = (attackerOwnerLabel === 'player') ? gameState.ai : gameState.player;
    const opponentGrid = opponentState.grid[0];

    // 1. Check for Taunt minions
    const tauntMonsters = [];
    for (let c = 0; c < 5; c++) {
        if (opponentGrid[c] && opponentGrid[c].ability?.effect === 'taunt') {
            tauntMonsters.push({ c: c }); // Structure for highlighting
        }
    }

    // 2. If Taunt exists, they are the only valid targets
    if (tauntMonsters.length > 0) {
        console.log("Opponent has Taunt, must target Taunt monsters.");
        return tauntMonsters;
    }

    // 3. If no Taunt, any opponent monster OR the hero is valid
    for (let c = 0; c < 5; c++) {
        if (opponentGrid[c]) {
            validTargets.push({ c: c }); // Structure for highlighting
        }
    }
    validTargets.push({ type: 'hero' }); // Add hero possibility

    // console.log("No Taunt. Valid targets:", validTargets.map(t => t.type === 'hero' ? 'Hero' : `Monster@${t.c}`));
    return validTargets;
}

// --- NEW: Show Game Over Menu ---
function showGameOverMenu(message) {
    if (!gameOverMenu || !gameOverMessageElement) return;
    gameOverMessageElement.textContent = message;
    gameOverMenu.style.display = 'flex'; // Show the menu
    gameContainer.style.opacity = '0.5'; // Optional: Dim game behind menu
    // Disable game interactions? Usually gameOver flag handles this.
}

// --- Win Condition Check (MODIFIED to show menu) ---
function checkWinCondition() {
    if (gameState.gameOver) return true;

    let winner = null;
    if (gameState.ai.hp <= 0) {
        winner = 'Player';
        console.log("GAME OVER: AI HP reached 0.");
        showMessage("YOU WIN!", 0); // Keep message for screen readers/fallback
    } else if (gameState.player.hp <= 0) {
        winner = 'AI';
        console.log("GAME OVER: Player HP reached 0.");
        showMessage("YOU LOSE!", 0);
    }

    if (winner) {
        endTurnButton.disabled = true; // Disable end turn btn
        gameState.gameOver = true;
        const message = (winner === 'Player') ? "YOU WIN!" : "YOU LOSE!";
        // Delay showing menu slightly to allow last UI updates/animations
        setTimeout(() => showGameOverMenu(message), 600);
        return true;
    }
    return false;
}

// --- Turn Management ---
function startPlayerTurn() {
    if (gameState.gameOver) return;
    console.log("--------------------");
    console.log(`Player Turn Started (Turn ${gameState.turnNumber})`);
    gameState.turn = 'player';
    gameState.selectedCard = null; gameState.selectedAttacker = null;

    if (gameState.player.maxMana < 10) gameState.player.maxMana++;
    gameState.player.mana = gameState.player.maxMana;

    // Refresh Monster Attacks (Summoning Sickness handled on summon)
    for (let c = 0; c < 5; c++) {
        const monster = gameState.player.grid[0][c];
        if (monster) {
            monster.hasAttacked = false;
            monster.canAttack = true; // All existing minions can attack
        }
    }
    // TODO: Apply start-of-turn effects

    const newlyDrawnInfo = drawCard(gameState.player, 'Player'); // Get info
    updateUI(newlyDrawnInfo); // Pass info to UI for potential animation
    updateTurnButton(true);
    showMessage(`Your Turn! (Turn ${gameState.turnNumber})`, 2000);
}

function endPlayerTurn() {
    if (gameState.turn !== 'player' || gameState.gameOver) return;
    console.log("Player Turn Ended");
    gameState.selectedCard = null; gameState.selectedAttacker = null;
    // TODO: Apply end-of-turn effects
    updateUI(); // Clear player highlights
    if (checkWinCondition()) return;
    startAITurn();
}

// --- AI Target Scoring ---
function calculateAttackScore(attacker, targetInfo, attackerHp, opponentHp, opponentGrid) {
    // --- ADD Considerations for DS / Poison ---
    let score = 0;
    const target = targetInfo.instance;

    score += 1;

    if (target) {
        const attackModifier = getElementalModifier(attacker.element, target.element);
        let effectiveAttackerAtk = Math.max(0, attacker.atk + attackModifier);
        const retaliationModifier = getElementalModifier(target.element, attacker.element);
        let effectiveTargetAtk = Math.max(0, target.atk + retaliationModifier);

        // --- Factor in Divine Shield ---
        let targetHasShield = target.hasDivineShield === true;
        if (targetHasShield) {
            // If target has shield, effective damage this turn is 0 unless we have multi-hit/ability
            // For simplicity, assume attack pops shield, real damage is 0 this hit.
            effectiveAttackerAtk = 0; // No damage this turn
            score -= 5; // Slightly discourage attacking shielded targets unless necessary
            if (attacker.atk > 0) score += 2; // Small bonus for popping shield if attack > 0
        }
        let attackerHasShield = attacker.hasDivineShield === true;
        if(attackerHasShield) {
            effectiveTargetAtk = 0; // No retaliation damage taken if attacker has shield
        }
        // --- End Divine Shield ---

        // --- Factor in Poisonous ---
        const attackerIsPoisonous = attacker.ability?.effect === 'poisonous';
        const targetIsPoisonous = target.ability?.effect === 'poisonous';
        // ---

        // Use effective values for calculations
        const canKill = (attackerIsPoisonous && effectiveAttackerAtk > 0) || (effectiveAttackerAtk >= target.currentHp && !targetHasShield); // Can kill if poisonous deals > 0 dmg or normal lethal
        const targetIsThreat = effectiveTargetAtk >= (attackerHp / 3);
        const diesToRetaliation = (targetIsPoisonous && effectiveTargetAtk > 0) || (effectiveTargetAtk >= attackerHp && !attackerHasShield); // Attacker dies if target poisonous deals > 0 dmg or normal lethal

        if (canKill) {
            score += 15;
            score += effectiveTargetAtk * 1.5;
            if (attackModifier > 0 && !targetHasShield) score += 3; // Bonus only if damage goes through
            if (attackerIsPoisonous && target.hp > 5) score += 5; // Bonus for poisoning high HP targets
        } else {
            score -= Math.max(0, (target.currentHp - effectiveAttackerAtk) / 2);
        }
        if (targetIsThreat) score += 5;
        if (diesToRetaliation && !canKill) score -= 30;
        else if (diesToRetaliation && canKill) score -= 5;
        if (target.ability?.effect === 'taunt' && canKill) score += 3;

    } else if (targetInfo.type === 'hero') {
        score += 2;
        if (attacker.atk >= opponentHp) score += 1000; // Lethal
        const aiMinions = gameState.ai.grid[0].filter(m => m).length;
        const playerMinions = gameState.player.grid[0].filter(m => m).length;
        if (playerMinions <= aiMinions / 2 && playerMinions < 2) score += 5;
    }

    // Lifesteal Consideration
     if (attacker.ability?.effect === 'lifesteal' && gameState.ai.hp < 20) {
         let potentialHeal = attacker.atk; // Base heal value
         if (target) potentialHeal = Math.min(effectiveAttackerAtk, target.currentHp); // Heal capped by effective damage / target HP
         score += potentialHeal * 1.5;
     }

    score += Math.random() * 0.5; // Tie-breaker
    return score;
}

// --- AI Turn (Logic Corrected for Rush & Instance Handling) ---
function startAITurn() {
    if (gameState.gameOver) return;
    console.log("--------------------");
    console.log(`AI Turn Started (Turn ${gameState.turnNumber})`);
    gameState.turn = 'ai';
    updateTurnButton(false); showMessage("Opponent's Turn", 2000);

    if (gameState.ai.maxMana < 10) gameState.ai.maxMana++;
    gameState.ai.mana = gameState.ai.maxMana;

    for (let c = 0; c < 5; c++) {
        const monster = gameState.ai.grid[0][c];
        if (monster) {
            monster.hasAttacked = false;
            monster.canAttack = true; // Refresh existing minions
        }
    }

    const newlyDrawnInfo = drawCard(gameState.ai, 'AI'); // Get info
    updateUI(newlyDrawnInfo); // Pass info (though AI draw isn't animated yet)

    setTimeout(() => { // 1. Play Cards Delay
        if (gameState.gameOver || gameState.turn !== 'ai') return;
        console.log("AI thinking about playing cards...");
        let cardPlayedThisTurn = false;

        while (true) {
            let boardHasSpace = gameState.ai.grid[0].some(slot => slot === null);
            if (!boardHasSpace) {
                console.log("AI board full.");
                break; // Stop if board full
            }

            let playableCards = gameState.ai.hand
                .filter(card => gameState.ai.mana >= card.manaCost)
                .sort((a, b) => b.manaCost - a.manaCost); // Prioritize expensive

            if (playableCards.length === 0) break; // No affordable cards

            const cardToPlayInstance = playableCards[0];
            let placed = false;

            for (let c = 0; c < 5; c++) {
                if (!gameState.ai.grid[0][c]) {
                    console.log(`AI playing ${cardToPlayInstance.name} (ID: ${cardToPlayInstance.instanceId}) into [${c}].`);
                    gameState.ai.mana -= cardToPlayInstance.manaCost;

                    // Move from Hand to Grid
                    const handIndex = gameState.ai.hand.findIndex(h => h.instanceId === cardToPlayInstance.instanceId);
                    if (handIndex > -1) gameState.ai.hand.splice(handIndex, 1);
                    else console.error("AI Error: Card instance not found in hand!");
                    gameState.ai.grid[0][c] = cardToPlayInstance;

                    // Check Rush
                    if (cardToPlayInstance.ability?.effect === 'rush') {
                        cardToPlayInstance.canAttack = true; // Override summoning sickness
                        console.log(`${cardToPlayInstance.name} has Rush.`);
                    } else {
                        cardToPlayInstance.canAttack = false; // Apply summoning sickness
                    }
                    cardToPlayInstance.hasAttacked = false;

                    // Trigger Summon Ability
                    if (cardToPlayInstance.ability?.type === 'onSummon') {
                        applyAbility(cardToPlayInstance, { c: c }, gameState.ai, gameState.player);
                    }

                    placed = true; cardPlayedThisTurn = true;
                    updateUI();
                    if (checkWinCondition()) return;
                    break; // Found slot
                }
            }
            if (!placed) break; // Should only happen if loop finishes unexpectedly
        } // End card playing loop

        // --- Chain to Attack Phase ---
        setTimeout(() => { // 2. Attack Delay
            if (gameState.gameOver || gameState.turn !== 'ai') return;
            console.log("AI thinking about attacking...");

            for (let c = 0; c < 5; c++) {
                if (gameState.gameOver) break;
                const attackerInstance = gameState.ai.grid[0][c];

                // Check canAttack flag (respects Rush/Sickness)
                if (attackerInstance && attackerInstance.canAttack && !attackerInstance.hasAttacked) {
                    console.log(`AI considering attack with ${attackerInstance.name} [${c}].`);
                    const validTargets = getValidTargets({ instance: attackerInstance, c: c });

                    if (validTargets.length > 0) {
                        let targetInfo = null;
                        const monsterTargets = validTargets.filter(t => t.c !== undefined);
                        const heroTargetPossible = validTargets.some(t => t.type === 'hero');

                        // Simple AI: Attack first monster target, else hero
                        if (monsterTargets.length > 0) {
                            const targetCol = monsterTargets[0].c;
                            const targetMonster = gameState.player.grid[0][targetCol];
                            if(targetMonster) targetInfo = { instance: targetMonster, c: targetCol };
                        } else if (heroTargetPossible) {
                            targetInfo = { type: 'hero' };
                        }

                        if (targetInfo) {
                            console.log(`AI attacking with ${attackerInstance.name}...`);
                            executeAttack({ instance: attackerInstance, c: c }, targetInfo);
                            if (gameState.gameOver) return;
                        } else {
                             console.log(`AI ${attackerInstance.name} had targets but selection failed.`);
                             // Mark attacked if target selection failed after finding possibilities
                             attackerInstance.hasAttacked = true; attackerInstance.canAttack = false;
                        }
                    } else {
                        console.log(`AI ${attackerInstance.name} has no valid targets.`);
                        attackerInstance.hasAttacked = true; attackerInstance.canAttack = false;
                    }
                }
            } // End attack loop
            console.log("AI finished attack phase.");
            updateUI(); // Final UI update after all attacks attempted

             // --- Chain to End Turn ---
            setTimeout(() => { // 3. End Turn Delay
                if (gameState.gameOver || gameState.turn !== 'ai') return;
                console.log("AI Turn Ended");
                if (checkWinCondition()) return;
                gameState.turnNumber++;
                startPlayerTurn();
            }, 500);

        }, cardPlayedThisTurn ? 700 : 300);

    }, 800 + Math.random() * 400);
}


// --- Game Initialization (Sets up state but doesn't start visually) ---
function initGame() {
    console.log("Initializing game state...");
    gameState = {
        player: { hp: 30, deck: [], hand: [], grid: [[null, null, null, null, null]], graveyard: [], mana: 1, maxMana: 1 },
        ai: { hp: 30, deck: [], hand: [], grid: [[null, null, null, null, null]], graveyard: [], mana: 0, maxMana: 0 },
        turn: 'player', turnNumber: 1, activeEffects: [], selectedCard: null, selectedAttacker: null, instanceCounter: 0, gameOver: false
    };

    // Generate Decks
    const deckSize = 20;
    for (let i = 0; i < deckSize; i++) {
        let cost = Math.floor(Math.random() * 4) + 1; if (i % 4 === 0) cost = Math.floor(Math.random() * 4) + 5;
        gameState.player.deck.push(MonsterGenerator.generateMonster(cost));
        gameState.ai.deck.push(MonsterGenerator.generateMonster(cost)); // Generate AI deck too
    }
    shuffleDeck(gameState.player.deck);
    shuffleDeck(gameState.ai.deck);

    // Initial Draw (into state only)
    for (let i = 0; i < 3; i++) {
        drawCard(gameState.player, 'Player');
        drawCard(gameState.ai, 'AI');
    }

    console.log("Game state initialized.");
    // UI update will happen when game actually starts visually
}

// --- NEW: Start Game Function ---
function startGame() {
    console.log("Starting game...");
    if (!gameContainer || !startMenu) return;

    // Initialize or re-initialize game state
    initGame();

    // Hide start menu, show game container
    startMenu.style.display = 'none';
    gameOverMenu.style.display = 'none'; // Ensure game over is hidden
    gameContainer.style.display = 'flex'; // Show game
    gameContainer.style.opacity = '1';    // Ensure full opacity

    // Perform initial UI render
    updateUI();
    updateTurnButton(true); // Enable button for player
    showMessage("Game Started. Your Turn!", 3000);
}

// --- Event Listeners (Added Rush Check on Player Summon) ---
function setupEventListeners() {
    const playerHandElement = document.getElementById('player-hand');
    const playerGridElement = document.getElementById('player-grid');
    const opponentGridElement = document.getElementById('opponent-grid');
    const opponentAreaElement = document.getElementById('opponent-area');
    const endTurnButton = document.getElementById('end-turn-button');
    const playerGraveyardBtn = document.getElementById('player-graveyard-btn');
    const opponentGraveyardBtn = document.getElementById('opponent-graveyard-btn');

    // Add listeners for the new menu buttons
    if (startGameButton) {
        startGameButton.addEventListener('click', startGame);
    } else { console.error("Start game button not found!"); }

    if (playAgainButton) {
        playAgainButton.addEventListener('click', () => {
            console.log("Play Again clicked");
            gameOverMenu.style.display = 'none'; // Hide game over menu
            startGame(); // Start a new game
        });
    } else { console.error("Play again button not found!"); }
    
    if (!playerHandElement || !playerGridElement || !opponentGridElement || !opponentAreaElement || !endTurnButton) { return; }

    endTurnButton.addEventListener('click', endPlayerTurn);

    // --- Player Hand Click ---
    playerHandElement.addEventListener('click', (event) => {
        if (gameState.turn !== 'player' || gameState.gameOver) return;
        const cardElement = event.target.closest('.card:not(.card-back)');
        if (!cardElement || !playerHandElement.contains(cardElement)) return;
        const instanceId = cardElement.dataset.instanceId;
        const cardData = gameState.player.hand.find(c => c.instanceId === instanceId);
        if (!cardData) return;

        if (gameState.selectedAttacker) gameState.selectedAttacker = null;

        if (gameState.player.mana >= cardData.manaCost) {
            gameState.selectedCard = (gameState.selectedCard?.instanceId === instanceId) ? null : cardData;
            updateUI();
        } else {
            showMessage("Not enough mana!", 1500);
            if (gameState.selectedCard?.instanceId === instanceId) { gameState.selectedCard = null; updateUI(); }
        }
    });

   // --- Player Grid Click ---
   playerGridElement.addEventListener('click', (event) => {
        if (gameState.turn !== 'player' || gameState.gameOver) return;
       const slotElement = event.target.closest('.grid-slot');
       if (!slotElement) return;
       const col = Array.from(slotElement.parentNode.children).indexOf(slotElement);
       if (col === -1) return;
       const monsterInSlot = gameState.player.grid[0][col];

       // Case 1: Playing selected card
       if (gameState.selectedCard && !monsterInSlot && slotElement.classList.contains('valid-summon-target')) {
            if (gameState.player.mana >= gameState.selectedCard.manaCost) {
                gameState.player.mana -= gameState.selectedCard.manaCost;
                const cardIndex = gameState.player.hand.findIndex(c => c.instanceId === gameState.selectedCard.instanceId);
                if (cardIndex > -1) {
                    const cardToPlayInstance = gameState.player.hand.splice(cardIndex, 1)[0];
                    gameState.player.grid[0][col] = cardToPlayInstance;

                    // Check Rush
                    if (cardToPlayInstance.ability?.effect === 'rush') {
                       cardToPlayInstance.canAttack = true;
                       console.log(`${cardToPlayInstance.name} has Rush.`);
                    } else {
                        cardToPlayInstance.canAttack = false; // Summoning Sickness
                    }
                    cardToPlayInstance.hasAttacked = false;

                    // Trigger Summon Ability
                    if (cardToPlayInstance.ability?.type === 'onSummon') {
                        applyAbility(cardToPlayInstance, { c: col }, gameState.player, gameState.ai);
                    }

                    gameState.selectedCard = null;
                    updateUI();
                    if(checkWinCondition()) return;
                } else { console.error("Selected card not found in hand?"); }
            } else { /* Low mana message already shown */ }
       }
       // Case 2: Select attacker
       else if (monsterInSlot && !gameState.selectedAttacker) {
            if (monsterInSlot.canAttack && !monsterInSlot.hasAttacked) {
               gameState.selectedCard = null;
               gameState.selectedAttacker = { instance: monsterInSlot, c: col };
               updateUI();
            } else { showMessage(monsterInSlot.hasAttacked ? "Attacked." : "Cannot attack.", 1500); }
       }
       // Case 3: Deselect attacker
       else if (monsterInSlot && gameState.selectedAttacker?.instance.instanceId === monsterInSlot.instanceId) {
            gameState.selectedAttacker = null; updateUI();
        }
       // Case 4: Switch attacker
       else if (monsterInSlot && gameState.selectedAttacker?.instance.instanceId !== monsterInSlot.instanceId) {
             if (monsterInSlot.canAttack && !monsterInSlot.hasAttacked) {
                   gameState.selectedAttacker = { instance: monsterInSlot, c: col }; updateUI();
             } else { gameState.selectedAttacker = null; updateUI(); }
        }
       // Case 5: Click empty slot (deselect)
       else if (!monsterInSlot) {
            if (gameState.selectedAttacker || gameState.selectedCard) {
                gameState.selectedAttacker = null; gameState.selectedCard = null; updateUI();
            }
       }
       // Case 6: Click occupied slot when summoning
       else if (monsterInSlot && gameState.selectedCard) {
            showMessage("Slot occupied.", 1500); gameState.selectedCard = null; updateUI();
        }
   });

    // --- Opponent Grid Click (Monster Target) ---
    opponentGridElement.addEventListener('click', (event) => {
        if (gameState.turn !== 'player' || !gameState.selectedAttacker || gameState.gameOver) return;
        const slotElement = event.target.closest('.grid-slot');

        if (!slotElement || !slotElement.classList.contains('valid-attack-target')) {
            // Clicked invalid slot or empty space
            return;
        }

        const col = Array.from(slotElement.parentNode.children).indexOf(slotElement);
        if (col === -1) return;
        const targetMonster = gameState.ai.grid[0][col];

        if (targetMonster) {
             const validTargets = getValidTargets(gameState.selectedAttacker);
             const isTargetValid = validTargets.some(target => target.c === col);
             if (isTargetValid) {
                 console.log(`Player targets monster: ${targetMonster.name} at [${col}]`);
                 executeAttack(gameState.selectedAttacker, { instance: targetMonster, c: col });
                 // executeAttack handles selection clear & UI update
             } else {
                 showMessage("Must attack Taunt minion!", 1500);
             }
        }
    });

    // --- Opponent Area Click (Hero Target) ---
    opponentAreaElement.addEventListener('click', (event) => {
        if (gameState.turn !== 'player' || !gameState.selectedAttacker || gameState.gameOver) return;

        const opponentInfoBar = opponentAreaElement.querySelector('.player-info');
        const opponentHpSpan = document.getElementById('opponent-hp');
        const isHeroTargetHighlighted = opponentInfoBar?.classList.contains('valid-hero-target-area') || opponentHpSpan?.classList.contains('valid-hero-target');
        const clickedOnInfoOrHp = opponentInfoBar?.contains(event.target) || opponentHpSpan?.contains(event.target);

        // Check if click was NOT on grid, but WAS on the highlighted info/hp area
        if (!opponentGridElement.contains(event.target) && clickedOnInfoOrHp && isHeroTargetHighlighted) {
             const validTargets = getValidTargets(gameState.selectedAttacker);
             const canTargetHero = validTargets.some(target => target.type === 'hero');
             if (canTargetHero) {
                 console.log("Player targets the opponent hero!");
                 executeAttack(gameState.selectedAttacker, { type: 'hero' });
                 // executeAttack handles selection clear & UI update
             } else {
                  showMessage("Cannot target hero (Must attack Taunt?).", 1500);
             }
        } else if (!opponentGridElement.contains(event.target) && !clickedOnInfoOrHp) {
            // Clicked empty space in opponent area, deselect attacker
            console.log("Clicked empty opponent area, deselecting attacker.");
            gameState.selectedAttacker = null;
            updateUI();
        }
    });

    playerGraveyardBtn.addEventListener('click', () => {
        console.log("Opening Player Graveyard");
        displayGraveyard(gameState.player, "Player Graveyard");
    });

    opponentGraveyardBtn.addEventListener('click', () => {
         console.log("Opening Opponent Graveyard");
         displayGraveyard(gameState.ai, "Opponent Graveyard");
    });
    
    console.log("Event listeners set up.");
    windowListenersInitialized = true; // Mark as initialized
}

// --- Initial Script Execution ---
// Don't start the game immediately, just set up the listener for the start button
document.addEventListener('DOMContentLoaded', () => {
    if (!windowListenersInitialized) {
         setupEventListeners(); // Setup all listeners, including start button
    }
    // Ensure start menu is visible and game is hidden initially
    if(startMenu) startMenu.style.display = 'flex';
    if(gameContainer) gameContainer.style.display = 'none';
    if(gameOverMenu) gameOverMenu.style.display = 'none';

});