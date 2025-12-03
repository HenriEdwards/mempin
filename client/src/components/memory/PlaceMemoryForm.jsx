import { useEffect, useRef, useState } from 'react';
import Input from '../ui/Input.jsx';
import TextArea from '../ui/TextArea.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import api from '../../services/api.js';

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'followers', label: 'Followers' },
  { value: 'unlisted', label: 'Unlisted' },
  { value: 'private', label: 'Private' },
];

const RADIUS_MARKS = [20, 50, 100, 200];
const EXPIRY_PRESETS = [
  { value: 7, label: '1 week' },
  { value: 30, label: '1 month' },
  { value: 365, label: '1 year' },
];

const defaultFormState = {
  title: '',
  shortDescription: '',
  body: '',
  tags: '',
  targetHandles: '',
  visibility: 'public',
  radiusM: 50,
  journeyId: '',
  journeyStep: 1,
  newJourneyTitle: '',
  newJourneyDescription: '',
  expiryMode: 'forever', // preset | custom | forever
  expiryPreset: EXPIRY_PRESETS[0].value,
  customExpiry: '',
  unlockMethod: 'location', // location | passcode | followers
  unlockPasscode: '',
  unlockAvailableFrom: '',
};

function PlaceMemoryForm({
  coords,
  onSubmit,
  onCancel,
  loading,
  suggestedTags = [],
  initialFormState = null,
  onPersistDraft = null,
}) {
  const [form, setForm] = useState(() => ({
    ...defaultFormState,
    ...(initialFormState || {}),
  }));
  const [journeys, setJourneys] = useState([]);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [audio, setAudio] = useState([]);
  const [videos, setVideos] = useState([]);
  const [expiryError, setExpiryError] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const mediaInputRef = useRef(null);

  useEffect(() => {
    api
      .getJourneys()
      .then((data) => setJourneys(data.journeys || []))
      .catch(() => {});
  }, []);

  useEffect(
    () => () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    },
    [imagePreviews],
  );

  const persistForm = (updater) => {
    setForm((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      onPersistDraft?.(next);
      return next;
    });
  };

  const updateField = (name, value) => {
    persistForm((prev) => ({ ...prev, [name]: value }));
  };

  const currentTagList = () =>
    form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

  const addTag = (tag) => {
    const existing = currentTagList();
    if (existing.includes(tag)) return;
    const next = [...existing, tag];
    updateField('tags', next.join(','));
  };

  const handleJourneyChange = (event) => {
    const value = event.target.value;
    persistForm((prev) => {
      const base = { ...prev, journeyId: value };
      if (!value) {
        return {
          ...base,
          journeyStep: 1,
          newJourneyTitle: '',
          newJourneyDescription: '',
        };
      }
      const journey = journeys.find((item) => String(item.id) === String(value));
      const nextStep = (Number(journey?.stepCount) || 0) + 1;
      return { ...base, journeyStep: nextStep };
    });
  };

  const handleMediaFiles = (files = []) => {
    if (!files.length) return;
    const imagesOnly = files.filter((file) => file.type.startsWith('image/'));
    const audioOnly = files.filter((file) => file.type.startsWith('audio/'));
    const videoOnly = files.filter((file) => file.type.startsWith('video/'));

    setImages((prev) => [...prev, ...imagesOnly]);
    const newPreviews = imagesOnly.map((file) => ({
      id: `${file.name}-${file.lastModified}`,
      url: URL.createObjectURL(file),
    }));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
    setAudio((prev) => [...prev, ...audioOnly]);
    setVideos((prev) => [...prev, ...videoOnly]);
  };

  const handleMediaInputChange = (event) => {
    const files = Array.from(event.target.files || []);
    handleMediaFiles(files);
    if (event.target.value) {
      event.target.value = '';
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files || []);
    handleMediaFiles(files);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!coords) return;
    if (form.unlockMethod === 'passcode' && form.unlockPasscode.trim().length < 4) {
      setUnlockError('Passcode must be at least 4 characters.');
      return;
    }
    setUnlockError('');
    const expiresAtISO = (() => {
      if (form.expiryMode === 'forever') return null;
      if (form.expiryMode === 'preset') {
        const days = Number(form.expiryPreset);
        if (!Number.isFinite(days) || days <= 0) return null;
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString();
      }
      if (form.expiryMode === 'custom' && form.customExpiry) {
        const candidate = new Date(form.customExpiry);
        if (Number.isNaN(candidate.getTime()) || candidate.getTime() <= Date.now()) {
          return null;
        }
        return candidate.toISOString();
      }
      return null;
    })();

    if (form.expiryMode !== 'forever' && !expiresAtISO) {
      setExpiryError('Choose a valid expiry date/time in the future or mark as forever.');
      return;
    }
    setExpiryError('');

    const payload = new FormData();
    payload.append('title', form.title.trim());
    payload.append('shortDescription', form.shortDescription.trim());
    payload.append('body', form.body.trim());
    payload.append('tags', form.tags);
    payload.append('targetHandles', form.targetHandles);
    payload.append('visibility', form.visibility);
    payload.append('radiusM', String(form.radiusM));
    payload.append('latitude', coords.latitude);
    payload.append('longitude', coords.longitude);
    payload.append('unlockMethod', form.unlockMethod);
    if (form.unlockMethod === 'passcode') {
      payload.append('unlockPasscode', form.unlockPasscode.trim());
    }
    if (form.unlockAvailableFrom) {
      payload.append('unlockAvailableFrom', form.unlockAvailableFrom);
    }
    if (expiresAtISO) {
      payload.append('expiresAt', expiresAtISO);
    }
    if (form.journeyId) {
      payload.append('journeyId', form.journeyId);
      payload.append('journeyStep', form.journeyStep);
    }
    if (form.newJourneyTitle) {
      payload.append('newJourneyTitle', form.newJourneyTitle);
      payload.append('newJourneyDescription', form.newJourneyDescription);
      payload.append('journeyStep', form.journeyStep);
    }

    images.forEach((file) => payload.append('images', file));
    audio.forEach((file) => payload.append('audio', file));
    videos.forEach((file) => payload.append('video', file));

    onSubmit(payload);
  };

  if (!coords) {
    return <p>Please enable location to place a memory.</p>;
  }

  return (
    <form className="form-grid place-memory-form" onSubmit={handleSubmit}>
      <div className="form-column">
        <div className="field with-counter">
          <Input
            label="Title"
            required
            value={form.title}
            maxLength={100}
            onChange={(event) => updateField('title', event.target.value)}
            placeholder="Name your memory"
          />
          <span>{form.title.length}/100</span>
        </div>
        <div className="field with-counter">
          <Input
            label="Short description"
            value={form.shortDescription}
            maxLength={120}
            onChange={(event) => updateField('shortDescription', event.target.value)}
            placeholder="One-line memory teaser"
          />
          <span>{form.shortDescription.length}/120</span>
        </div>
        <div className="field with-counter">
          <TextArea
            label="Story"
            value={form.body}
            maxLength={800}
            placeholder="Tell the story..."
            onChange={(event) => updateField('body', event.target.value)}
          />
          <span>{form.body.length}/800</span>
        </div>
        <Input
          label="Tags"
          value={form.tags}
          placeholder="love,travel,park"
          onChange={(event) => updateField('tags', event.target.value)}
        />
        {suggestedTags.length > 0 && (
          <div className="tag-suggestions">
            <span className="chip-label">Recent tags:</span>
            <div className="chip-group">
              {suggestedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="chip chip--clickable"
                  onClick={() => addTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
        <Input
          label="Targeted recipients (handles)"
          value={form.targetHandles}
          placeholder="@friend, another_friend"
          onChange={(event) => updateField('targetHandles', event.target.value)}
        />
      </div>

      <div className="form-column">
        <Select
          label="Visibility"
          value={form.visibility}
          onChange={(event) => updateField('visibility', event.target.value)}
        >
          {VISIBILITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <div className="field">
          <label>Unlock method</label>
          <div className="unlock-options">
            <label className={`unlock-option ${form.unlockMethod === 'none' ? 'active' : ''}`}>
              <input
                type="radio"
                name="unlockMethod"
                value="none"
                checked={form.unlockMethod === 'none'}
                onChange={() => {
                  setUnlockError('');
                  persistForm((prev) => ({ ...prev, unlockMethod: 'none', unlockPasscode: '' }));
                }}
              />
              <span>None (instant)</span>
            </label>
            <label className={`unlock-option ${form.unlockMethod === 'location' ? 'active' : ''}`}>
              <input
                type="radio"
                name="unlockMethod"
                value="location"
                checked={form.unlockMethod === 'location'}
                onChange={() => {
                  setUnlockError('');
                  persistForm((prev) => ({ ...prev, unlockMethod: 'location', unlockPasscode: '' }));
                }}
              />
              <span>Within radius</span>
            </label>
            <label className={`unlock-option ${form.unlockMethod === 'followers' ? 'active' : ''}`}>
              <input
                type="radio"
                name="unlockMethod"
                value="followers"
                checked={form.unlockMethod === 'followers'}
                onChange={() => {
                  setUnlockError('');
                  persistForm((prev) => ({ ...prev, unlockMethod: 'followers', unlockPasscode: '' }));
                }}
              />
              <span>Must follow you</span>
            </label>
            <label className={`unlock-option ${form.unlockMethod === 'passcode' ? 'active' : ''}`}>
              <input
                type="radio"
                name="unlockMethod"
                value="passcode"
                checked={form.unlockMethod === 'passcode'}
                onChange={() => {
                  setUnlockError('');
                  persistForm((prev) => ({ ...prev, unlockMethod: 'passcode' }));
                }}
              />
              <span>Passcode</span>
            </label>
          </div>
          {form.unlockMethod === 'passcode' && (
            <Input
              label="Unlock passcode"
              value={form.unlockPasscode}
              onChange={(event) => {
                setUnlockError('');
                updateField('unlockPasscode', event.target.value);
              }}
              placeholder="Enter passcode"
            />
          )}
          {unlockError && <p className="input-error" style={{ marginTop: '0.35rem' }}>{unlockError}</p>}
        </div>
        <div className="field">
          <label>Unlock available from (optional)</label>
          <Input
            type="datetime-local"
            value={form.unlockAvailableFrom}
            onChange={(event) => updateField('unlockAvailableFrom', event.target.value)}
          />
        </div>
        <div className="field">
          <label title="How close someone must be to unlock">Radius</label>
          <input
            className="slider"
            type="range"
            min={20}
            max={200}
            step={5}
            value={form.radiusM}
            disabled={form.unlockMethod !== 'location'}
            onChange={(event) => updateField('radiusM', Number(event.target.value))}
          />
          <div className="slider-marks">
            {RADIUS_MARKS.map((mark) => (
              <span key={mark}>{mark}m</span>
            ))}
          </div>
          <span className="chip">{form.radiusM} meters</span>
        </div>
        <div className="field">
          <label>Expiry</label>
          <div className="chip-group">
            {EXPIRY_PRESETS.map((option) => {
              const active = form.expiryMode === 'preset' && Number(form.expiryPreset) === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`chip chip--clickable ${active ? 'chip--active' : ''}`}
                  onClick={() => {
                    setExpiryError('');
                persistForm((prev) => ({
                  ...prev,
                  expiryMode: 'preset',
                  expiryPreset: option.value,
                }));
              }}
            >
              {option.label}
            </button>
          );
            })}
            <button
              type="button"
              className={`chip chip--clickable ${form.expiryMode === 'forever' ? 'chip--active' : ''}`}
              onClick={() => {
                setExpiryError('');
                persistForm((prev) => ({
                  ...prev,
                  expiryMode: 'forever',
                }));
              }}
            >
              Forever
            </button>
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <Input
              label="Custom date/time"
              type="datetime-local"
              value={form.customExpiry}
              onChange={(event) => {
                setExpiryError('');
                persistForm((prev) => ({
                  ...prev,
                  customExpiry: event.target.value,
                  expiryMode: event.target.value ? 'custom' : prev.expiryMode,
                }));
              }}
            />
          </div>
          {expiryError && <p className="input-error" style={{ marginTop: '0.4rem' }}>{expiryError}</p>}
        </div>
        <div className="field">
          <label>Journey</label>
          <Select
            value={form.journeyId}
            onChange={handleJourneyChange}
          >
            <option value="">No journey</option>
            {journeys.map((journey) => (
              <option key={journey.id} value={journey.id}>
                {journey.title} ({journey.stepCount} steps)
              </option>
            ))}
          </Select>
          <Input
            label="New journey title"
            value={form.newJourneyTitle}
            onChange={(event) => updateField('newJourneyTitle', event.target.value)}
            placeholder="Leave blank to use existing"
            disabled={Boolean(form.journeyId)}
          />
          <TextArea
            label="New journey description"
            value={form.newJourneyDescription}
            onChange={(event) => updateField('newJourneyDescription', event.target.value)}
            disabled={Boolean(form.journeyId)}
          />
          {(form.journeyId || form.newJourneyTitle) && (
            <Input
              label="Journey step"
              type="number"
              min={1}
              value={form.journeyStep}
            onChange={(event) =>
              updateField('journeyStep', Math.max(1, Number(event.target.value)))
            }
          />
        )}
        </div>
        <div
          className="media-dropzone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <p className="media-dropzone__text">Drag images, audio, or video here</p>
          <Button variant="ghost" onClick={() => mediaInputRef.current?.click()}>
            Upload
          </Button>
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,audio/*,video/*"
            multiple
            onChange={handleMediaInputChange}
            style={{ display: 'none' }}
          />
          {(imagePreviews.length > 0 || audio.length > 0 || videos.length > 0) && (
            <div className="media-preview">
              {imagePreviews.map((preview) => (
                <img key={preview.id} src={preview.url} alt="" />
              ))}
              {(audio.length > 0 || videos.length > 0) && (
                <ul className="media-files">
                  {audio.map((file) => (
                    <li key={`${file.name}-${file.size}`}>{file.name}</li>
                  ))}
                  {videos.map((file) => (
                    <li key={`${file.name}-${file.size}`}>{file.name}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="form-actions">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Saving...' : 'Save memory'}
        </Button>
      </div>
    </form>
  );
}

export default PlaceMemoryForm;
