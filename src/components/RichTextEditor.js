import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const RichTextEditor = ({
  value,
  onChange,
  placeholder = 'Escribe aquí...',
  height = '200px',
  readOnly = false,
}) => {
  const [focused, setFocused] = useState(false);

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      ['link', 'code-block'],
      ['clean'],
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'link', 'code-block',
  ];

  const modulesCSS = `
    .rte-container {
      border: 1.5px solid var(--border-default);
      border-radius: 12px;
      overflow: hidden;
      background: var(--bg-elevated);
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .rte-container:focus-within {
      border-color: var(--accent);
      box-shadow: 0 0 0 4px var(--accent-subtle);
    }
    .rte-container.readonly .ql-toolbar {
      display: none;
    }
    .rte-container .ql-toolbar.ql-snow {
      border: none;
      border-bottom: 1px solid var(--border-light);
      background: var(--bg-subtle);
      padding: 8px 12px;
    }
    .rte-container .ql-container.ql-snow {
      border: none;
      font-family: inherit;
      font-size: 15px;
    }
    .rte-container .ql-editor {
      min-height: ${height};
      max-height: 400px;
      overflow-y: auto;
      padding: 16px;
      line-height: 1.7;
      color: var(--text-primary);
    }
    .rte-container .ql-editor.ql-blank::before {
      color: var(--text-tertiary);
      font-style: normal;
    }
    .rte-container .ql-editor h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 22px;
      margin-bottom: 12px;
      color: var(--text-primary);
    }
    .rte-container .ql-editor h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 18px;
      margin-bottom: 10px;
      color: var(--text-primary);
    }
    .rte-container .ql-editor h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 16px;
      margin-bottom: 8px;
      color: var(--text-primary);
    }
    .rte-container .ql-editor p {
      margin-bottom: 8px;
    }
    .rte-container .ql-editor a {
      color: var(--accent);
      text-decoration: underline;
    }
    .rte-container .ql-editor code {
      background: var(--bg-subtle);
      padding: 2px 6px;
      border-radius: 6px;
      font-family: 'Fira Code', 'Courier New', monospace;
      font-size: 13px;
      color: var(--danger);
    }
    .rte-container .ql-editor pre.ql-syntax {
      background: var(--bg-elevated);
      color: var(--text-secondary);
      padding: 16px;
      border-radius: 10px;
      overflow-x: auto;
      font-family: 'Fira Code', 'Courier New', monospace;
      font-size: 13px;
      margin: 12px 0;
      border: 1px solid var(--border-default);
    }
    .rte-container .ql-editor ul,
    .rte-container .ql-editor ol {
      padding-left: 24px;
      margin-bottom: 8px;
    }
    .rte-container .ql-editor li {
      margin-bottom: 4px;
    }
    .rte-container .ql-editor blockquote {
      border-left: 3px solid var(--accent);
      padding-left: 16px;
      margin: 12px 0;
      color: var(--text-secondary);
    }
    .rte-container .ql-snow .ql-stroke {
      stroke: var(--text-secondary);
    }
    .rte-container .ql-snow .ql-fill {
      fill: var(--text-secondary);
    }
    .rte-container .ql-snow .ql-picker {
      color: var(--text-secondary);
    }
    .rte-container .ql-snow .ql-picker-options {
      background: var(--bg-elevated);
      border-radius: 10px;
      box-shadow: var(--shadow-float);
      border: 1px solid var(--border-default);
    }
    .rte-container .ql-snow button:hover .ql-stroke,
    .rte-container .ql-snow button.ql-active .ql-stroke {
      stroke: var(--accent);
    }
    .rte-container .ql-snow button:hover .ql-fill,
    .rte-container .ql-snow button.ql-active .ql-fill {
      fill: var(--accent);
    }
    .rte-container .ql-snow button:hover,
    .rte-container .ql-snow button.ql-active {
      color: var(--accent);
    }
  `;

  return (
    <div className={`rte-container ${readOnly ? 'readonly' : ''}`}>
      <style>{modulesCSS}</style>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
};

export default RichTextEditor;
