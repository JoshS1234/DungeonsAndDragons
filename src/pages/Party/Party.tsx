import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCurrentUser } from "../../auth/currentUser";
import InitiativeTracker from "../../components/Party/InitiativeTracker";
import PartyCard from "../../components/Party/PartyCard";
import { getCampaign } from "../../services/campaigns";
import type { CampaignMember } from "../../services/campaigns";
import { watchCharacter } from "../../services/characters";
import type { StoredCharacter } from "../../services/characters";
import { watchEncounter } from "../../services/encounters";
import type { Encounter } from "../../utils/encounter";
import { errorMessage, isPermissionDenied } from "../../utils/errors";
// Shared list/picker and status styles
import "../../components/Spells/Spells.scss";
import "../Play/PlayMode.scss";
import "./Party.scss";

/** Live view of a campaign's party, plus the initiative tracker. */
const Party = () => {
  const user = useCurrentUser();
  const campaignId = useParams<{ id: string }>().id!;
  const [campaign, setCampaign] = useState<{
    name: string;
    isDm: boolean;
    players: CampaignMember[];
  } | null>(null);
  const [characters, setCharacters] = useState<Record<string, StoredCharacter>>(
    {}
  );
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const stops: Array<() => void> = [];
    const fail = (err: unknown) =>
      setError(
        isPermissionDenied(err)
          ? "You don't have permission to view this campaign"
          : errorMessage(err, "Failed to load the party")
      );

    getCampaign(campaignId, user.uid)
      .then((loaded) => {
        if (cancelled) return;
        if (!loaded) throw new Error("Campaign not found");
        setCampaign({
          name: loaded.campaign.campaignName,
          isDm: loaded.isDm,
          players: loaded.players,
        });
        for (const player of loaded.players) {
          if (!player.characterId) continue;
          stops.push(
            watchCharacter(
              player.characterId,
              (stored) =>
                setCharacters((prev) => {
                  const next = { ...prev };
                  if (stored) next[stored.id] = stored;
                  else delete next[player.characterId!];
                  return next;
                }),
              // A character that's left the campaign just drops out
              () => {}
            )
          );
        }
        stops.push(watchEncounter(campaignId, setEncounter, fail));
      })
      .catch(fail);

    return () => {
      cancelled = true;
      stops.forEach((stop) => stop());
    };
  }, [campaignId, user.uid]);

  if (error) {
    return (
      <div className="page-content">
        <h2>Party unavailable</h2>
        <p role="alert">{error}</p>
      </div>
    );
  }
  if (!campaign) return <p className="app-loading">Loading…</p>;

  const party = campaign.players
    .map((p) => (p.characterId ? characters[p.characterId] : undefined))
    .filter((c): c is StoredCharacter => !!c);

  return (
    <div className="party">
      <div className="party__header">
        <h2>{campaign.name}: Party</h2>
        <Link to={`/campaigns/${campaignId}`} className="back-button">
          Campaign
        </Link>
      </div>

      {campaign.players.length === 0 ? (
        <p className="spells__hint">
          No players yet. Share the campaign ID so they can join.
        </p>
      ) : (
        <div className="party__grid">
          {campaign.players.map((player) => {
            const stored = player.characterId
              ? characters[player.characterId]
              : undefined;
            return stored ? (
              <PartyCard
                key={player.userId}
                stored={stored}
                playerName={player.playerName}
              />
            ) : (
              <p key={player.userId} className="party-card">
                Loading {player.characterName}…
              </p>
            );
          })}
        </div>
      )}

      <InitiativeTracker
        campaignId={campaignId}
        isDm={campaign.isDm}
        party={party}
        encounter={encounter}
      />
    </div>
  );
};

export default Party;
