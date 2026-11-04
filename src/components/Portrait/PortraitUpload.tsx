import { useState } from "react";
import Portrait from "./Portrait";
import { removePortrait, uploadPortrait } from "../../services/portraits";
import { errorMessage } from "../../utils/errors";
import { resizeImage } from "../../utils/image";

type PortraitUploadProps = {
  characterId: string;
  name: string;
  url: string;
  onChange: (url: string) => void;
  canEdit: boolean;
};

const PortraitUpload = ({
  characterId,
  name,
  url,
  onChange,
  canEdit,
}: PortraitUploadProps) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    setError(null);
    try {
      onChange(await action());
    } catch (err) {
      setError(errorMessage(err, "Couldn't update the portrait"));
    } finally {
      setBusy(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    run(async () => uploadPortrait(characterId, await resizeImage(file)));
  };

  return (
    <div className="portrait-upload">
      <Portrait url={url} name={name} size="large" />
      {canEdit && (
        <div className="portrait-upload__controls">
          <label className="portrait-upload__button">
            {busy ? "Saving..." : url ? "Change portrait" : "Upload portrait"}
            <input
              type="file"
              accept="image/*"
              onChange={handleFile}
              disabled={busy}
            />
          </label>
          {url && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await removePortrait(characterId);
                  return "";
                })
              }
            >
              Remove portrait
            </button>
          )}
        </div>
      )}
      {error && (
        <p className="portrait-upload__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default PortraitUpload;
