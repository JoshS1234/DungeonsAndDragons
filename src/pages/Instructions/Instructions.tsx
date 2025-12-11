import Header from "../../components/Header/Header";
import "./Instructions.scss";

const Instructions = () => {
  return (
    <div className="app">
      <Header />
      <div className="instructions-content">
        <h1>📚 How to Use the D&D Campaign Manager</h1>
        <p className="instructions-intro">
          Welcome to your D&D Campaign Manager! This guide will help you get
          started whether you're a player or a Dungeon Master.
        </p>

        {/* Player Section */}
        <section className="instructions-section">
          <h2>👥 For Players</h2>
          
          <div className="instruction-card">
            <h3>Creating a Character</h3>
            <ol>
              <li>Navigate to the <strong>Characters</strong> page from the homepage</li>
              <li>Click the <strong>"Create New Character"</strong> button</li>
              <li>Fill in your character's details:
                <ul>
                  <li>Character name, class, race, background, and alignment</li>
                  <li>Ability scores (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma)</li>
                  <li>Hit points, armor class, and other combat stats</li>
                  <li>Skills, equipment, spells, and notes</li>
                  <li>Optionally upload a character image</li>
                </ul>
              </li>
              <li>Click <strong>"Save Character"</strong> to create your character</li>
            </ol>
          </div>

          <div className="instruction-card">
            <h3>Editing a Character</h3>
            <ol>
              <li>Go to the <strong>Characters</strong> page</li>
              <li>Click on the character card you want to edit</li>
              <li>Modify any character details you want to change</li>
              <li>Click <strong>"Save Changes"</strong> to update your character</li>
            </ol>
            <p className="instruction-note">
              <strong>Note:</strong> If you're viewing a character from a campaign where you're not the owner, you'll have view-only access and won't be able to edit it.
            </p>
          </div>

          <div className="instruction-card">
            <h3>Deleting a Character</h3>
            <ol>
              <li>Open the character you want to delete (from the Characters page)</li>
              <li>Scroll to the bottom of the character sheet</li>
              <li>Click the <strong>"Delete Character"</strong> button</li>
              <li>Type the character's exact name to confirm deletion</li>
              <li>Confirm the deletion</li>
            </ol>
            <p className="instruction-warning">
              <strong>⚠️ Warning:</strong> This action cannot be undone. Your character will be permanently deleted and removed from all linked campaigns.
            </p>
          </div>

          <div className="instruction-card">
            <h3>Adding a Character to a Campaign</h3>
            <ol>
              <li>Open your character (from the Characters page)</li>
              <li>Scroll to the <strong>"Linked Campaigns"</strong> section</li>
              <li>Enter the <strong>Campaign ID</strong> provided by your Dungeon Master</li>
              <li>Click <strong>"Link Campaign"</strong></li>
              <li>Your character will now appear in that campaign, and you'll be added as a player</li>
            </ol>
            <p className="instruction-note">
              <strong>Tip:</strong> You can link the same character to multiple campaigns!
            </p>
          </div>

          <div className="instruction-card">
            <h3>Removing a Character from a Campaign</h3>
            <ol>
              <li>Open your character (from the Characters page)</li>
              <li>In the <strong>"Linked Campaigns"</strong> section, find the campaign you want to leave</li>
              <li>Click the <strong>✕</strong> button next to that campaign</li>
              <li>Your character will be removed from the campaign</li>
            </ol>
            <p className="instruction-note">
              Alternatively, you can remove yourself from a campaign directly from the campaign page by clicking the ✕ button next to your character in the players list.
            </p>
          </div>

          <div className="instruction-card">
            <h3>Viewing Campaign Details</h3>
            <ol>
              <li>Go to the <strong>Campaigns</strong> page from the homepage</li>
              <li>You'll see two sections:
                <ul>
                  <li><strong>"My Campaigns"</strong> - Campaigns where you are the Dungeon Master</li>
                  <li><strong>"Campaigns I'm Playing In"</strong> - Campaigns where you are a player</li>
                </ul>
              </li>
              <li>Click on any campaign card to view its details</li>
              <li>You can see:
                <ul>
                  <li>Campaign name, description, setting, and world</li>
                  <li>Dungeon Master information</li>
                  <li>Current level and status</li>
                  <li>Start date and theme</li>
                  <li>List of all players and their characters</li>
                </ul>
              </li>
              <li>Click on any player's character name to view their character sheet (view-only)</li>
            </ol>
            <p className="instruction-note">
              <strong>Note:</strong> As a player, you can view campaign details but cannot edit them. DM Notes are only visible to the campaign owner.
            </p>
          </div>
        </section>

        {/* DM Section */}
        <section className="instructions-section">
          <h2>🎲 For Dungeon Masters</h2>
          
          <div className="instruction-card">
            <h3>Creating a Campaign</h3>
            <ol>
              <li>Navigate to the <strong>Campaigns</strong> page from the homepage</li>
              <li>Click the <strong>"Create New Campaign"</strong> button</li>
              <li>Fill in your campaign details:
                <ul>
                  <li>Campaign name and description</li>
                  <li>Setting and world information</li>
                  <li>Dungeon Master name</li>
                  <li>Current level (starting level for your players)</li>
                  <li>Start date (format: DD/MM/YYYY)</li>
                  <li>Status (e.g., Active, On Hold, Completed)</li>
                  <li>Theme and atmosphere</li>
                  <li>DM Notes (private notes only visible to you)</li>
                </ul>
              </li>
              <li>Click <strong>"Create Campaign"</strong> to save your campaign</li>
              <li>After creation, you'll see a <strong>Campaign ID</strong> at the top of the page</li>
            </ol>
          </div>

          <div className="instruction-card">
            <h3>Sharing Your Campaign with Players</h3>
            <ol>
              <li>After creating a campaign, you'll see the <strong>Campaign ID</strong> displayed at the top</li>
              <li>Copy this ID (there's a <strong>"Copy"</strong> button for convenience)</li>
              <li>Share the Campaign ID with your players</li>
              <li>Players will then:
                <ol type="a">
                  <li>Go to their Characters page</li>
                  <li>Open the character they want to use</li>
                  <li>Enter your Campaign ID in the "Linked Campaigns" section</li>
                  <li>Click "Link Campaign"</li>
                </ol>
              </li>
              <li>Once linked, the player and their character will automatically appear in your campaign's player list</li>
            </ol>
            <p className="instruction-tip">
              <strong>💡 Tip:</strong> Players can link the same character to multiple campaigns, so they can use the same character across different adventures!
            </p>
          </div>

          <div className="instruction-card">
            <h3>Managing Players in Your Campaign</h3>
            <ol>
              <li>Open your campaign (from the Campaigns page)</li>
              <li>Scroll to the <strong>"Players"</strong> section at the bottom</li>
              <li>You'll see all players who have linked their characters to your campaign</li>
              <li>You can:
                <ul>
                  <li>Click on any player's character name to view their character sheet</li>
                  <li>Click the <strong>✕</strong> button to remove a player from your campaign (this also unlinks their character)</li>
                </ul>
              </li>
            </ol>
          </div>

          <div className="instruction-card">
            <h3>Editing Your Campaign</h3>
            <ol>
              <li>Go to the <strong>Campaigns</strong> page</li>
              <li>Click on your campaign (it will have a gold border and "⭐ Dungeon Master" badge)</li>
              <li>Modify any campaign details you want to update</li>
              <li>Click <strong>"Save Changes"</strong> to update your campaign</li>
            </ol>
            <p className="instruction-note">
              <strong>Note:</strong> Only campaign owners (DMs) can edit campaigns. Players have view-only access.
            </p>
          </div>

          <div className="instruction-card">
            <h3>DM Notes Feature</h3>
            <p>
              The <strong>DM Notes</strong> field is a private section visible only to you, the campaign owner. Use it to:
            </p>
            <ul>
              <li>Store plot ideas and story arcs</li>
              <li>Keep track of NPCs and their motivations</li>
              <li>Plan future encounters and adventures</li>
              <li>Note important player actions and consequences</li>
              <li>Store any other private campaign information</li>
            </ul>
            <p className="instruction-note">
              <strong>Privacy:</strong> Players cannot see DM Notes, even when viewing campaign details.
            </p>
          </div>
        </section>

        {/* General Tips */}
        <section className="instructions-section">
          <h2>💡 General Tips</h2>
          <div className="instruction-card">
            <ul>
              <li>Always use the <strong>Home</strong> button in the top navigation to return to the homepage</li>
              <li>Use the <strong>"My Account"</strong> link to update your profile and change your password</li>
              <li>Check the <strong>"Rules"</strong> page for D&D rulebooks and reference materials</li>
              <li>Character images are optional but can help bring your character to life</li>
              <li>Campaign IDs are unique - make sure you copy the correct one when linking characters</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Instructions;

