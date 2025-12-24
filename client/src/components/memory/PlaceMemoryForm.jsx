import { useEffect, useRef, useState } from 'react';
import Input from '../ui/Input.jsx';
import TextArea from '../ui/TextArea.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import api from '../../services/api.js';
import { normalizeHandle } from '../../utils/handles.js';

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
  tags: '',
  targetHandles: '',
  visibility: 'public',
  radiusM: 50,
  journeyId: '',
  journeyStep: 1,
  newJourneyTitle: '',
  newJourneyDescription: '',
  createJourney: false,
  completeJourney: false,
  expiryMode: 'forever', // preset | custom | forever
  expiryPreset: EXPIRY_PRESETS[0].value,
  customExpiry: '',
  unlockRequiresLocation: true,
  unlockRequiresFollowers: false,
  unlockRequiresPasscode: false,
  unlockPasscode: '',
  unlockNone: false,
  unlockAvailableFrom: '',
};

function mapLegacyUnlockMethod(method = 'location') {
  const value = String(method || '').toLowerCase();
  switch (value) {
    case 'none':
      return {
        unlockRequiresLocation: false,
        unlockRequiresFollowers: false,
        unlockRequiresPasscode: false,
      };
    case 'followers':
      return {
        unlockRequiresLocation: false,
        unlockRequiresFollowers: true,
        unlockRequiresPasscode: false,
      };
    case 'passcode':
      return {
        unlockRequiresLocation: false,
        unlockRequiresFollowers: false,
        unlockRequiresPasscode: true,
      };
    case 'location':
    default:
      return {
        unlockRequiresLocation: true,
        unlockRequiresFollowers: false,
        unlockRequiresPasscode: false,
      };
  }
}

function PlaceMemoryForm({
  coords,
  onSubmit,
  onCancel,
  loading,
  suggestedTags = [],
  initialFormState = null,
  onPersistDraft = null,
}) {
  const [form, setForm] = useState(() => {
    const merged = { ...defaultFormState, ...(initialFormState || {}) };
    if (initialFormState?.unlockMethod && !initialFormState.unlockRequiresLocation && !initialFormState.unlockRequiresFollowers && !initialFormState.unlockRequiresPasscode) {
      const legacy = mapLegacyUnlockMethod(initialFormState.unlockMethod);
      return { ...merged, ...legacy };
    }
    if (merged.newJourneyTitle || merged.newJourneyDescription) {
      merged.createJourney = true;
      merged.journeyId = '';
    }
    if (!merged.journeyId) {
      merged.completeJourney = false;
    }
    return merged;
  });
  const [targetInput, setTargetInput] = useState('');
  const [targetHandles, setTargetHandles] = useState(() => {
    const raw = initialFormState?.targetHandles || '';
    return raw
      .split(',')
      .map((val) => normalizeHandle(val))
      .filter(Boolean);
  });
  const [targetSuggestions, setTargetSuggestions] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [audio, setAudio] = useState([]);
  const [videos, setVideos] = useState([]);
  const [expiryError, setExpiryError] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const mediaInputRef = useRef(null);

  useEffect(() => {
    api
      .getJourneys()
      .then((data) => setJourneys(data.journeys || []))
      .catch(() => {});
    const loadSuggestions = async () => {
      try {
        const [suggestionsRes, followersRes] = await Promise.allSettled([
          api.getFollowerSuggestions(),
          api.getFollowers(),
        ]);
        const bucket = new Map();
        if (suggestionsRes.status === 'fulfilled') {
          (suggestionsRes.value?.suggestions || []).forEach((item) => {
            const handle = normalizeHandle(item.handle || '');
            if (handle && !bucket.has(handle)) bucket.set(handle, { handle, name: item.name || '' });
          });
        }
        if (followersRes.status === 'fulfilled') {
          const following = followersRes.value?.following || [];
          const followers = followersRes.value?.followers || [];
          [...following, ...followers].forEach((item) => {
            const handle = normalizeHandle(item.handle || item.username || '');
            if (handle && !bucket.has(handle)) bucket.set(handle, { handle, name: item.name || '' });
          });
        }
        setTargetSuggestions(Array.from(bucket.values()));
      } catch {
        setTargetSuggestions([]);
      }
    };
    loadSuggestions();
  }, []);

  useEffect(
    () => () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    },
    [imagePreviews],
  );

  useEffect(() => {
    if (showAdvanced) return;
    if (
      form.visibility !== 'public' ||
      Boolean(form.unlockAvailableFrom) ||
      targetHandles.length > 0 ||
      form.journeyId ||
      form.createJourney
    ) {
      setShowAdvanced(true);
    }
  }, [
    form.createJourney,
    form.journeyId,
    form.unlockAvailableFrom,
    form.visibility,
    showAdvanced,
    targetHandles.length,
  ]);

  const persistForm = (updater) => {
    setForm((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      onPersistDraft?.(next);
      return next;
    });
  };

  const noneSelected = form.unlockNone;

  const syncTargetHandles = (list) => {
    const unique = Array.from(new Set(list));
    setTargetHandles(unique);
    persistForm((prev) => ({ ...prev, targetHandles: unique.join(',') }));
  };

  const addTargetHandle = (value) => {
    const normalized = normalizeHandle(value);
    if (!normalized) return;
    if (targetHandles.includes(normalized)) {
      setTargetInput('');
      return;
    }
    syncTargetHandles([...targetHandles, normalized]);
    setTargetInput('');
  };

  const removeTargetHandle = (value) => {
    syncTargetHandles(targetHandles.filter((item) => item !== value));
  };

  const updateField = (name, value) => {
    persistForm((prev) => ({ ...prev, [name]: value }));
  };

  const currentTagList = () =>
    form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  const recentTags = suggestedTags.slice(-12);

  const addTag = (tag) => {
    const existing = currentTagList();
    if (existing.includes(tag)) return;
    const next = [...existing, tag];
    updateField('tags', next.join(','));
  };

  const handleJourneySelect = (journeyId) => {
    persistForm((prev) => {
      const journey = journeys.find((item) => String(item.id) === String(journeyId));
      const nextStep = (Number(journey?.stepCount) || 0) + 1;
      return {
        ...prev,
        journeyId,
        createJourney: false,
        newJourneyTitle: '',
        newJourneyDescription: '',
        completeJourney: false,
        journeyStep: nextStep,
      };
    });
  };

const handleCreateJourneySelect = () => {
  persistForm((prev) => ({
    ...prev,
    journeyId: '',
    createJourney: true,
    completeJourney: false,
    journeyStep: 1,
  }));
};

  const handleJourneyNone = () => {
    persistForm((prev) => ({
      ...prev,
      journeyId: '',
      createJourney: false,
      newJourneyTitle: '',
      newJourneyDescription: '',
      completeJourney: false,
      journeyStep: 1,
    }));
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
    if (!form.unlockNone && form.unlockRequiresPasscode && form.unlockPasscode.trim().length < 4) {
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
    payload.append('tags', form.tags);
    payload.append('targetHandles', targetHandles.join(','));
    payload.append('completeJourney', String(form.completeJourney && (form.createJourney || form.journeyId)));
    payload.append('visibility', form.visibility);
    payload.append('radiusM', String(form.radiusM));
    payload.append('latitude', coords.latitude);
    payload.append('longitude', coords.longitude);
    const determineLegacyMethod = () => {
      if (form.unlockNone) return 'none';
      const flags = [
        form.unlockRequiresLocation,
        form.unlockRequiresFollowers,
        form.unlockRequiresPasscode,
      ].filter(Boolean).length;
      if (flags === 0) return 'none';
      if (flags === 1) {
        if (form.unlockRequiresLocation) return 'location';
        if (form.unlockRequiresFollowers) return 'followers';
        if (form.unlockRequiresPasscode) return 'passcode';
      }
      return 'custom';
    };

    payload.append('unlockMethod', determineLegacyMethod());
    payload.append('unlockRequiresLocation', String(form.unlockNone ? false : form.unlockRequiresLocation));
    payload.append('unlockRequiresFollowers', String(form.unlockNone ? false : form.unlockRequiresFollowers));
    payload.append('unlockRequiresPasscode', String(form.unlockNone ? false : form.unlockRequiresPasscode));

    if (!form.unlockNone && form.unlockRequiresPasscode) {
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
    if (form.createJourney && form.newJourneyTitle) {
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
            <button
              type="button"
              className={`chip chip--clickable ${form.expiryMode === 'custom' ? 'chip--active' : ''}`}
              onClick={() => {
                setExpiryError('');
                persistForm((prev) => ({
                  ...prev,
                  expiryMode: 'custom',
                }));
              }}
            >
              Custom
            </button>
          </div>
          {form.expiryMode === 'custom' && (
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
          )}
          {expiryError && <p className="input-error" style={{ marginTop: '0.4rem' }}>{expiryError}</p>}
        </div>
      </div>

      <div className="form-column">
        <div className="field">
          <Input
            label="Tags"
            value={form.tags}
            placeholder="love,travel,park"
            onChange={(event) => updateField('tags', event.target.value)}
          />
          {recentTags.length > 0 && (
            <div className="tag-suggestions">
              <span className="chip-label">Recent tags:</span>
              <div className="chip-group">
                {recentTags.map((tag) => (
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
        </div>
        <div className="field">
          <label className="unlock-label-row">
            <span>Unlock requirements (stackable)</span>
            <label className={`unlock-option unlock-option--inline ${noneSelected ? 'active' : ''}`}>
              <input
                type="checkbox"
                name="unlockNone"
                checked={noneSelected}
                onChange={() => {
                  setUnlockError('');
                  persistForm((prev) => ({
                    ...prev,
                    unlockNone: !prev.unlockNone,
                    unlockRequiresLocation: false,
                    unlockRequiresFollowers: false,
                    unlockRequiresPasscode: false,
                    unlockPasscode: '',
                  }));
                }}
              />
              <span>None</span>
            </label>
          </label>
          <div className="unlock-options unlock-options--checkbox">
            <label className={`unlock-option ${form.unlockRequiresLocation ? 'active' : ''} ${noneSelected ? 'disabled' : ''}`}>
              <div className="unlock-option__header">
                <input
                  type="checkbox"
                  name="unlockRequiresLocation"
                  checked={form.unlockRequiresLocation}
                  disabled={noneSelected}
                  onChange={(event) => {
                    setUnlockError('');
                    const next = event.target.checked;
                    persistForm((prev) => ({ ...prev, unlockRequiresLocation: next, unlockNone: false }));
                  }}
                />
                <span>Within radius</span>
              </div>
              <div className="unlock-option__control">
                <input
                  className="slider slider--inline"
                  type="range"
                  min={20}
                  max={200}
                  step={5}
                  value={form.radiusM}
                  disabled={!form.unlockRequiresLocation || noneSelected}
                  onChange={(event) => updateField('radiusM', Number(event.target.value))}
                />
                <span className="chip chip--inline">{form.radiusM} m</span>
              </div>
            </label>
            <label className={`unlock-option ${form.unlockRequiresPasscode ? 'active' : ''} ${noneSelected ? 'disabled' : ''}`}>
              <div className="unlock-option__header">
                <input
                  type="checkbox"
                  name="unlockRequiresPasscode"
                  checked={form.unlockRequiresPasscode}
                  disabled={noneSelected}
                  onChange={(event) => {
                    const next = event.target.checked;
                    setUnlockError('');
                    persistForm((prev) => ({
                      ...prev,
                      unlockNone: false,
                      unlockRequiresPasscode: next,
                      unlockPasscode: next ? prev.unlockPasscode : '',
                    }));
                  }}
                />
                <span>Passcode</span>
              </div>
              {form.unlockRequiresPasscode && !noneSelected && (
                <div className="unlock-option__control unlock-option__control--passcode">
                  <Input
                    label=""
                    value={form.unlockPasscode}
                    onChange={(event) => {
                      setUnlockError('');
                      updateField('unlockPasscode', event.target.value);
                    }}
                    placeholder="Enter passcode"
                  />
                </div>
              )}
            </label>
            <label className={`unlock-option ${form.unlockRequiresFollowers ? 'active' : ''} ${noneSelected ? 'disabled' : ''}`}>
              <div className="unlock-option__header">
                <input
                  type="checkbox"
                  name="unlockRequiresFollowers"
                  checked={form.unlockRequiresFollowers}
                  disabled={noneSelected}
                  onChange={(event) => {
                    setUnlockError('');
                    const next = event.target.checked;
                    persistForm((prev) => ({ ...prev, unlockRequiresFollowers: next, unlockNone: false }));
                  }}
                />
                <span>Must follow you</span>
              </div>
            </label>
          </div>
          {unlockError && <p className="input-error" style={{ marginTop: '0.35rem' }}>{unlockError}</p>}
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

      <div className="advanced-toggle-row">
        <button
          type="button"
          className="advanced-toggle"
          onClick={() => setShowAdvanced((prev) => !prev)}
        >
          <span className="advanced-toggle__chevron" aria-hidden="true">
            {showAdvanced ? '▾' : '▸'}
          </span>
          <span>Advanced settings</span>
        </button>
        <div className="advanced-toggle__divider" />
      </div>

      {showAdvanced && (
        <div className="advanced-section">
          <div className="advanced-grid">
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
              <label>Unlock available from (optional)</label>
              <Input
                type="datetime-local"
                value={form.unlockAvailableFrom}
                onChange={(event) => updateField('unlockAvailableFrom', event.target.value)}
              />
            </div>

            <div className="field">
              <label>Targeted recipients (handles)</label>
              <div className="chips-input">
                <div className="chips-input__selected">
                  {targetHandles.map((handle) => (
                    <span key={handle} className="chip chip--clickable chips-input__chip">
                      @{handle}
                      <button
                        type="button"
                        className="chips-input__remove"
                        onClick={() => removeTargetHandle(handle)}
                        aria-label={`Remove ${handle}`}
                      >
                        A-
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={targetInput}
                    onChange={(event) => setTargetInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ',') {
                        event.preventDefault();
                        addTargetHandle(targetInput);
                      }
                    }}
                    placeholder={targetHandles.length ? 'Add another' : '@friend'}
                    className="chips-input__field"
                  />
                </div>
                {targetInput.trim() && (
                  <div className="chips-input__suggestions">
                    {(() => {
                      const filtered = targetSuggestions
                        .filter((item) => {
                          const handle = normalizeHandle(item.handle || '');
                          if (!handle) return false;
                          if (targetHandles.includes(handle)) return false;
                          return handle.includes(normalizeHandle(targetInput));
                        })
                        .slice(0, 6);
                      if (!filtered.length) {
                        return (
                          <div className="chips-input__suggestion chips-input__suggestion--empty">
                            No matches
                          </div>
                        );
                      }
                      return filtered.map((item) => {
                        const handle = normalizeHandle(item.handle || '');
                        return (
                          <button
                            type="button"
                            key={handle}
                            className="chips-input__suggestion"
                            onClick={() => addTargetHandle(handle)}
                          >
                            @{handle}
                            {item.name ? <span className="muted"> {item.name}</span> : null}
                          </button>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>

            <div className="field">
              <div className="journey-label-row">
                <label>Journey</label>
              </div>
              <div className="journey-options">
                <button
                  type="button"
                  className={`journey-option ${form.createJourney ? 'journey-option--active' : ''}`}
                  onClick={() => {
                    if (form.createJourney) {
                      handleJourneyNone();
                    } else {
                      handleCreateJourneySelect();
                    }
                  }}
                >
                  {form.createJourney ? '- New journey' : '+ New journey'}
                </button>
                {journeys
                  .filter((journey) => !journey.completed)
                  .map((journey) => (
                  <button
                    key={journey.id}
                    type="button"
                    className={`journey-option ${form.journeyId === String(journey.id) ? 'journey-option--active' : ''}`}
                    onClick={() => handleJourneySelect(String(journey.id))}
                    disabled={form.createJourney}
                    title={`${journey.title} (${journey.stepCount || 0} steps)`}
                  >
                    {journey.title}
                    <span className="journey-option__meta">{journey.stepCount || 0} steps</span>
                  </button>
                ))}
              </div>
              {form.createJourney && (
                <div className="journey-new-fields">
                  <Input
                    label="New journey title"
                    value={form.newJourneyTitle}
                    onChange={(event) => updateField('newJourneyTitle', event.target.value)}
                    placeholder="Name your journey"
                  />
                  <TextArea
                    label="New journey description"
                    value={form.newJourneyDescription}
                    onChange={(event) => updateField('newJourneyDescription', event.target.value)}
                  />
                </div>
              )}
              {(form.journeyId || form.createJourney) && (
                <div className="journey-step-row">
                  <div className="journey-step-display">
                    <span className="chip chip--inline">Step {form.journeyStep || 1}</span>
                  </div>
                  <label className="journey-complete">
                    <input
                      type="checkbox"
                      checked={form.completeJourney}
                      onChange={(event) =>
                        persistForm((prev) => ({
                          ...prev,
                          completeJourney: event.target.checked,
                        }))
                      }
                    />
                    <span>Final step</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
