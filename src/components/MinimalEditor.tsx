'use client'

import React from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

const modules = {
  toolbar: [['bold', 'italic', 'link']],
}

const formats = ['bold', 'italic', 'link']

interface MinimalEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function MinimalEditor({ value, onChange, placeholder }: MinimalEditorProps) {
  return (
    <div className="minimal-editor">
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{
          backgroundColor: 'white',
        }}
      />
      <style jsx global>{`
        .minimal-editor .ql-toolbar {
          border-top: 1px solid #d1d5db;
          border-left: 1px solid #d1d5db;
          border-right: 1px solid #d1d5db;
          border-bottom: none;
          border-radius: 0.375rem 0.375rem 0 0;
        }
        .minimal-editor .ql-container {
          border-bottom: 1px solid #d1d5db;
          border-left: 1px solid #d1d5db;
          border-right: 1px solid #d1d5db;
          border-top: none;
          border-radius: 0 0 0.375rem 0.375rem;
          font-family: inherit;
        }
        .minimal-editor .ql-editor {
          min-height: 100px;
          font-size: 14px;
          line-height: 1.5;
        }
        .minimal-editor .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
        }
      `}</style>
    </div>
  )
}
