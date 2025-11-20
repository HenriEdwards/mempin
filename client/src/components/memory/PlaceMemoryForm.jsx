import { useEffect, useState } from 'react';
import Input from '../ui/Input.jsx';
import TextArea from '../ui/TextArea.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import api from '../../services/api.js';

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'friends', label: 'Friends' },
  { value: 'unlisted', label: 'Unlisted' },
  { value: 'private', label: 'Private' },
];

const RADIUS_MARKS = [20, 50, 100, 200];

function PlaceMemoryForm({ coords, onSubmit, onCancel, loading, suggestedTags = [] }) {
  const [form, setForm] = useState({
    title: '',
    shortDescription: '',
    body: '',
    tags: '',
    targetEmails: '',
    visibility: 'public',
    radiusM: 50,
    journeyId: '',
    journeyStep: 1,
    newJourneyTitle: '',
    newJourneyDescription: '',
  });
  const [journeys, setJourneys] = useState([]);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [audio, setAudio] = useState([]);

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

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
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
    updateField('journeyId', value);
    if (!value) {
      updateField('journeyStep', 1);
      updateField('newJourneyTitle', '');
      updateField('newJourneyDescription', '');
      return;
    }
    const journey = journeys.find((item) => String(item.id) === String(value));
    const nextStep = (Number(journey?.stepCount) || 0) + 1;
    updateField('journeyStep', nextStep);
  };

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files || []);
    setImages(files);
    const previews = files.map((file) => ({
      id: `${file.name}-${file.lastModified}`,
      url: URL.createObjectURL(file),
    }));
    setImagePreviews(previews);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!coords) return;

    const payload = new FormData();
    payload.append('title', form.title.trim());
    payload.append('shortDescription', form.shortDescription.trim());
    payload.append('body', form.body.trim());
    payload.append('tags', form.tags);
    payload.append('targetEmails', form.targetEmails);
    payload.append('visibility', form.visibility);
    payload.append('radiusM', String(form.radiusM));
    payload.append('latitude', coords.latitude);
    payload.append('longitude', coords.longitude);
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
          label="Targeted recipients (emails)"
          value={form.targetEmails}
          placeholder="friend@example.com, another@example.com"
          onChange={(event) => updateField('targetEmails', event.target.value)}
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
          <label title="How close someone must be to unlock">Radius</label>
          <input
            className="slider"
            type="range"
            min={20}
            max={200}
            step={5}
            value={form.radiusM}
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
        <div className="field">
          <label>Upload images</label>
          <input type="file" accept="image/*" multiple onChange={handleImageChange} />
          <div className="media-preview">
            {imagePreviews.map((preview) => (
              <img key={preview.id} src={preview.url} alt="" />
            ))}
          </div>
        </div>
        <div className="field">
          <label>Upload audio</label>
          <input
            type="file"
            accept="audio/*"
            multiple
            onChange={(event) => setAudio(Array.from(event.target.files || []))}
          />
          {audio.length > 0 && (
            <ul className="media-files">
              {audio.map((file) => (
                <li key={`${file.name}-${file.size}`}>{file.name}</li>
              ))}
            </ul>
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
