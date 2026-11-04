import type { ChangeEvent, ReactNode } from "react";
import NumberInput from "../NumberInput/NumberInput";
import { formatDateInput } from "../../utils/formatDateInput";
import { CAMPAIGN_STATUSES } from "../../services/campaigns";
import type { CampaignDetails } from "../../services/campaigns";

export type CampaignFormValues = CampaignDetails & { notes: string };

type TextKey = Exclude<keyof CampaignFormValues, "currentLevel">;

type CampaignFormFieldsProps = {
  values: CampaignFormValues;
  onFieldChange: <K extends keyof CampaignFormValues>(
    key: K,
    value: CampaignFormValues[K]
  ) => void;
  disabled?: boolean;
  /** DM notes are only shown to the DM. */
  showNotes?: boolean;
};

const CampaignFormFields = ({
  values,
  onFieldChange,
  disabled = false,
  showNotes = true,
}: CampaignFormFieldsProps) => {
  const handleTextChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const key = e.target.name as TextKey;
    const value =
      key === "startDate" ? formatDateInput(e.target.value) : e.target.value;
    onFieldChange(key, value);
  };

  const textInput = (
    key: TextKey,
    label: string,
    placeholder: string,
    extra: { required?: boolean } = {}
  ) => (
    <div className="campaign-form__group">
      <label htmlFor={key}>{label}</label>
      <input
        type="text"
        id={key}
        name={key}
        value={values[key]}
        onChange={handleTextChange}
        disabled={disabled}
        placeholder={placeholder}
        {...extra}
      />
    </div>
  );

  const textArea = (
    key: TextKey,
    label: ReactNode,
    rows: number,
    placeholder: string
  ) => (
    <div className="campaign-form__group">
      <label htmlFor={key}>{label}</label>
      <textarea
        id={key}
        name={key}
        value={values[key]}
        onChange={handleTextChange}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <>
      <section className="campaign-form__section">
        <h3>Campaign Information</h3>
        <div className="campaign-form__grid campaign-form__grid--2">
          {textInput("campaignName", "Campaign Name *", "Enter campaign name", {
            required: true,
          })}
          {textInput("dungeonMaster", "Dungeon Master", "DM name")}
          {textInput(
            "setting",
            "Setting / World",
            "e.g., Forgotten Realms, Homebrew"
          )}
          <div className="campaign-form__group">
            <label htmlFor="currentLevel">Current Party Level</label>
            <NumberInput
              id="currentLevel"
              name="currentLevel"
              value={values.currentLevel}
              onChange={(level) => onFieldChange("currentLevel", level)}
              fallback={1}
              min={1}
              max={20}
              disabled={disabled}
            />
          </div>
          <div className="campaign-form__group">
            <label htmlFor="startDate">Start Date (DD/MM/YYYY)</label>
            <input
              type="text"
              id="startDate"
              name="startDate"
              value={values.startDate}
              onChange={handleTextChange}
              disabled={disabled}
              placeholder="DD/MM/YYYY"
              pattern="^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/\d{4}$"
              title="Please enter date in DD/MM/YYYY format"
            />
          </div>
          <div className="campaign-form__group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={values.status}
              onChange={handleTextChange}
              disabled={disabled}
            >
              {CAMPAIGN_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="campaign-form__section">
        <h3>Campaign Details</h3>
        {textArea(
          "description",
          "Description",
          6,
          "Describe your campaign, its story, and key events..."
        )}
        {textInput(
          "theme",
          "Theme",
          "e.g., Mystery, Exploration, Political Intrigue"
        )}
        {textArea(
          "world",
          "World Information",
          4,
          "World-building details, locations, important places..."
        )}
        {showNotes &&
          textArea(
            "notes",
            <>
              DM Notes{" "}
              <span className="campaign-form__label-note">
                *This will not be shown to players*
              </span>
            </>,
            6,
            "Private notes, plot ideas, NPCs, future plans..."
          )}
      </section>
    </>
  );
};

export default CampaignFormFields;
