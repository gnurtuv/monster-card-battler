# Monster Card Battler

A single-player, turn-based monster card battle game built entirely with vanilla HTML, CSS, and JavaScript. Face off against a basic AI opponent using decks of procedurally generated monsters, ensuring unique stats, abilities, names, and abstract art every game!

## Live Demo

Play the game live on GitHub Pages:
**[https://gnurtuv.github.io/monster-card-battler/](https://gnurtuv.github.io/monster-card-battler/)**

## Features

*   **Procedural Monster Generation:** Monsters (stats, names, abilities, elements) are generated uniquely for each game using JavaScript, providing high replayability.
*   **Abstract Procedural Art:** Monster visuals are generated dynamically using the HTML Canvas API based on their properties (element, stats, cost), ensuring visual relevance without pre-made assets. Includes multiple base shapes (circle, square, triangle, hexagon, blob, biped, eye, flame) and visual modifiers.
*   **Core Card Game Mechanics:** Mana system, drawing cards, playing minions to a 1x5 grid, attacking minions or the enemy hero.
*   **Implemented Abilities/Keywords:**
    *   Taunt
    *   Rush
    *   Lifesteal
    *   Divine Shield
    *   Poisonous
    *   On Summon Effects (Direct Damage, Buff Attack)
    *   On Attack Effects (Splash Damage)
*   **Elemental Interaction:** Basic system where Fire > Earth > Water > Fire deal +1 damage.
*   **Basic AI Opponent:** Features target prioritization logic based on threats, lethal, and basic value considerations.
*   **User Interface Refinements:**
    *   Start and Game Over menus.
    *   Deck, Hand, and Graveyard card counts.
    *   Viewable Graveyard modal.
    *   Tooltips for cards on the grid.
    *   Visual state indicators on grid cards (Taunt, Divine Shield, Poisonous, Exhausted).
    *   Basic animations for attacks, damage numbers, and minion defeat.

## How to Play

1.  Visit the [Live Demo](#live-demo) link above.
2.  Click "Start Game".
3.  Click-to-select then click-to-place cards from your hand to empty slots on your grid, paying their mana cost (top right of hand card).
4.  Click your minions on the grid that can attack (not grayed out/no '💤' icon) to select them as attackers.
5.  Click a valid enemy target (minion on their grid or the opponent's HP/info bar if no Taunt minions are present) to attack. Targets will be highlighted.
6.  Click "End Turn" when you are finished with your actions.
7.  Reduce the opponent's HP to 0 to win!

## Technologies Used

*   HTML5
*   CSS3 (including Flexbox, Grid, Animations)
*   Vanilla JavaScript (ES6+)
*   HTML Canvas 2D API (for procedural art)

## Running Locally

1.  Clone the repository: `https://github.com/gnurtuv/monster-card-battler.git`
2.  Navigate to the project directory: `cd monster-card-battler`
3.  Open the `index.html` file in your web browser.

## Project Structure

*   `index.html`: Main HTML file containing the game structure.
*   `css/style.css`: Contains all the styling for the game interface and elements.
*   `js/monsterGenerator.js`: Handles the procedural generation of monster stats, names, abilities, and art data.
*   `js/ui.js`: Manages all DOM manipulation, rendering cards, updating UI elements (HP, mana, counts), displaying messages, handling animations, and rendering procedural art via Canvas.
*   `js/game.js`: Contains the core game logic, state management, turn flow, combat resolution, ability execution, AI logic, and event listeners.

## Future Development Ideas

*   Implement Spell Cards.
*   Further enhance AI (Value Trading, Mana Curve optimization, Ability awareness).
*   Add more diverse abilities and keywords (Stealth, Deathrattles, Auras, Targeted Battlecries).
*   Implement Fatigue damage for empty decks.
*   Refine procedural art generation and add more visual polish/animations.
*   Add sound effects.
*   Develop a simple deck editor/collection view.

<!-- Optional
## Contributing
Contributions, issues, and feature requests are welcome!
-->
