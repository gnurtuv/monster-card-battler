// js/monsterGenerator.js

const MonsterGenerator = (() => { // Use an IIFE for encapsulation

    const ELEMENTS = ["Fire", "Water", "Earth", "Neutral"];
    const BASE_SHAPES = ['circle', 'square', 'triangle', 'hexagon', 'blob', 'biped', 'eye', 'flame'];

    // --- Name Generation Parts ---
    const ADJECTIVES = ["Swift", "Stone", "Shadow", "Gleaming", "Raging", "Silent", "Ancient", "Frozen", "Molten", "Vampiric", "Charging", "Mighty", "Sacred", "Venomous"]; // Added
    const NOUNS = ["Imp", "Golem", "Sprite", "Whelp", "Beast", "Wurm", "Thing", "Watcher", "Shard", "Hunter", "Warrior", "Leech", "Paladin", "Serpent"]; // Added
    const SUFFIXES = ["ling", "kin", "er", "oid", "on", "us", "a"];

    // --- Ability Components ---
    const ABILITY_TEMPLATES = [
        // Existing
        { name: "Fortify", effect: 'healSelf', type: 'onSummon', baseValue: 3, costFactor: 0.5, description: (v) => `Summon: Gains +${v} HP.` },
        { name: "Quick Burn", effect: 'directOpponentDamage', type: 'onSummon', baseValue: 1, costFactor: 0.8, description: (v) => `Summon: Deals ${v} damage to opponent.` },
        { name: "Ignite", effect: 'directDamage', type: 'onAttack', baseValue: 1, costFactor: 0.6, description: (v) => `Attack: Deals ${v} extra damage.` },
        { name: "Splash", effect: 'adjacentDamage', type: 'onAttack', baseValue: 1, costFactor: 0.4, description: (v) => `Attack: Deals ${v} damage to adjacent enemies.` },
        { name: "Taunt", effect: 'taunt', type: 'passive', baseValue: 0, costFactor: 1.0, description: () => `Taunt (Enemies must attack this).` },
        { name: "Rush", effect: 'rush', type: 'passive', baseValue: 0, costFactor: 1.2, description: () => `Rush (Can attack the turn it is played).` },
        { name: "Lifesteal", effect: 'lifesteal', type: 'passive', baseValue: 0, costFactor: 1.0, description: () => `Lifesteal (Heals your hero for damage dealt).` },
        { name: "Empower", effect: 'buffAttack', type: 'onSummon', baseValue: 1, costFactor: 0.7, description: (v) => `Summon: Gains +${v} Attack.` },
        // --- NEW ABILITIES ---
        { name: "Divine Shield", effect: 'divineShield', type: 'passive', baseValue: 0, costFactor: 1.4, description: () => `Divine Shield (Ignores first damage taken).` }, // Quite strong
        { name: "Poisonous", effect: 'poisonous', type: 'passive', baseValue: 0, costFactor: 1.5, description: () => `Poisonous (Destroys any minion damaged by this).` }, // Very strong
        // --- End New ---
    ];
    const ABILITY_CHANCE = 0.80; // Slightly higher chance

    // --- Generation Functions ---

    function generateName() {
        const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
        const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
        let name = `${adj} ${noun}`;
        if (Math.random() < 0.3) {
            const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
            name += suffix;
        }
        return name;
    }

    function calculateStats(manaCost, hasAbility, abilityCostFactor, abilityEffect = null) {
        let statBudget = manaCost * 2 + Math.floor(Math.random() * 3) + 1;
        if (hasAbility) {
            // More impactful abilities should reduce budget more
            statBudget -= Math.ceil(abilityCostFactor * (1 + manaCost / 8)); // Scale budget reduction slightly with cost
        }
        statBudget = Math.max(1, statBudget);

        // Try a slightly different allocation - more variance
        const atkRatio = 0.3 + Math.random() * 0.4; // Allocate 30-70% budget to attack points
        let atkPoints = Math.max(1, Math.round(statBudget * atkRatio));
        let hpPoints = Math.max(1, statBudget - atkPoints);

        let atk = atkPoints + Math.floor(Math.random() * 2);
        let hp = hpPoints * 4 + Math.floor(Math.random() * 6);

        // --- Balancing Override for Poisonous ---
        if (abilityEffect === 'poisonous') {
            console.log(`Applying Poisonous stat penalty to budget-based stats (${atk}/${hp})`);
            atk = 1; // Force attack to 1
            // Assign minimal HP, maybe slightly scaling with cost but still very low
            hp = Math.floor(Math.random() * 4) + 1; // Random integer: 1, 2, 3, or 4
            console.log(` > Poisonous stats set to: ${atk}/${hp}`);
        }
        // --- End Override ---
        return { atk: Math.max(1, atk), hp: Math.max(1, hp) };
    }

    function generateAbility(manaCost) {
        if (Math.random() > ABILITY_CHANCE) {
            return { ability: null, costFactor: 0 };
        }

        // Filter out templates that might be too strong/weak for the cost? (Optional advanced)
        const suitableTemplates = ABILITY_TEMPLATES; // For now, allow all
        if (suitableTemplates.length === 0) return { ability: null, costFactor: 0 };

        const template = { ...suitableTemplates[Math.floor(Math.random() * suitableTemplates.length)] };

        let value = template.baseValue;
        if (value > 0) {
             // Scale value based on cost and maybe base value itself
            value += Math.floor(manaCost / 2.5); // Increase value more significantly with higher cost
            value = Math.max(1, value);
        }

        const ability = {
            name: template.name, // Use defined name
            description: template.description(value),
            type: template.type,
            effect: template.effect,
            value: value, // Value might be 0 for passives like Taunt, Rush, Lifesteal
        };

        // Adjust cost factor slightly based on value? (More advanced balancing)
        let finalCostFactor = template.costFactor;
        if (value > template.baseValue && value > 1) {
            finalCostFactor *= (1 + (value - template.baseValue) * 0.1); // Higher value increases cost factor slightly
        }

        return { ability, costFactor: finalCostFactor };
    }

    // Corrected function for monsterGenerator.js
function generateMonsterArtData(properties) {
    const { element, hp, atk, manaCost, ability } = properties;
    const artData = {};

    // 1. Color based on Element
    switch (element) {
        case "Fire":  artData.baseColor = `hsl(${Math.random()*20}, 85%, ${55 + Math.random()*10}%)`; break;
        case "Water": artData.baseColor = `hsl(${190 + Math.random()*40}, 80%, ${55 + Math.random()*10}%)`; break;
        case "Earth": artData.baseColor = `hsl(${70 + Math.random()*50}, 60%, ${45 + Math.random()*10}%)`; break;
        default:      artData.baseColor = `hsl(${Math.random()*360}, ${Math.random()*15}%, ${65 + Math.random()*10}%)`; break;
    }

    // --- CORRECTED Secondary Color Calculation (Handles Decimals) ---
    const baseColorStr = artData.baseColor;
    let secondaryColor = 'hsl(0, 0%, 80%)'; // Safe default fallback

    // Regex to capture numbers (including decimals) for H, S, L
    // Allows optional spaces around commas and percentages
    const hslRegex = /hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/;
    const hslMatches = baseColorStr.match(hslRegex);

    if (hslMatches && hslMatches.length === 4) { // Check if all 3 values were captured
        try {
            // Use parseFloat now instead of parseInt
            const baseHue = parseFloat(hslMatches[1]);
            const baseSat = parseFloat(hslMatches[2]);
            const baseLig = parseFloat(hslMatches[3]);

            const ligOffset = (Math.random() > 0.5 ? 15 : -15);
            const secondaryLig = Math.max(0, Math.min(100, baseLig + ligOffset)); // Clamp lightness

            // Reconstruct with same saturation, potentially adjusted lightness
            secondaryColor = `hsl(${baseHue.toFixed(2)}, ${baseSat.toFixed(2)}%, ${secondaryLig.toFixed(2)}%)`; // Format nicely
        } catch (e) {
            console.error("Error parsing HSL values:", e, "Input:", baseColorStr);
        }
    } else {
        console.warn("Could not parse baseColor with regex:", baseColorStr, "Regex:", hslRegex.source, "Matches:", hslMatches);
    }
    artData.secondaryColor = secondaryColor;
    // --- END CORRECTION ---


    // Shape, Size, Modifiers
    artData.baseShape = BASE_SHAPES[Math.floor(Math.random() * BASE_SHAPES.length)];
    console.log("Selected baseShape:", artData.baseShape);
    artData.sizeModifier = 0.6 + (manaCost / 15);
    artData.shapeModifiers = [];
    if (atk > manaCost * 1.5 && atk > 3) artData.shapeModifiers.push({ type: 'spikes', count: Math.min(8, Math.floor(atk / 1.5)) });
    if (hp > manaCost * 6 && hp > 15) artData.shapeModifiers.push({ type: 'thickness', value: Math.min(4, Math.floor(hp / 12)) });

    // 5. Ability Icon
    artData.abilityIcon = null;
    if (ability) {
        switch (ability.effect) {
            case 'taunt': artData.abilityIcon = 'shield'; break;
            case 'directDamage':
            case 'directOpponentDamage':
            case 'adjacentDamage': artData.abilityIcon = 'burst'; break;
            case 'healSelf':
            case 'lifesteal': artData.abilityIcon = 'plus'; break;
            case 'rush': artData.abilityIcon = 'arrow'; break;
            case 'buffAttack': artData.abilityIcon = 'sword'; break;
            case 'divineShield': artData.abilityIcon = 'bubble'; break; // Or reuse 'shield' with different style?
            case 'poisonous': artData.abilityIcon = 'skull'; break;
        }
    }

    // console.log("Generated artData:", artData); // Keep for debugging if needed
    return artData;
}

    // --- Public generateMonster Function ---
    function generateMonster(targetManaCost = null) {
        const monster = {};
        monster.manaCost = targetManaCost !== null ? targetManaCost : Math.floor(Math.random() * 7) + 1;
        const { ability, costFactor } = generateAbility(monster.manaCost);
        monster.ability = ability;
        const { atk, hp } = calculateStats(monster.manaCost, !!ability, costFactor, ability?.effect);
        monster.atk = atk; monster.hp = hp;
        monster.id = `gen_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        monster.name = generateName();
        monster.element = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
        monster.rarity = "Generated"; monster.level = 1;
        monster.artData = generateMonsterArtData(monster);
        monster.canAttack = false; // Summoning sickness default

        // --- Add specific flags needed for abilities ---
        if (monster.ability?.effect === 'divineShield') {
            monster.hasDivineShield = true; // Add the flag
        }
        // Poisonous doesn't need a state flag, it's checked on the attacker

        return monster;
    }

    return { generateMonster: generateMonster };

})();