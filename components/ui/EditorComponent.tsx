"use client";

import React, { useState } from "react";
import Editor from "@monaco-editor/react";

interface EditorProps {
  initialCode?: string;
  language?: string;
  onSave?: (code: string) => void;
}

export default function EditorComponent({ 
  initialCode = "// 코드를 입력하세요\n", 
  language = "c", 
  onSave 
}: EditorProps) {
  const [code, setCode] = useState<string | undefined>(initialCode);

  const handleEditorChange = (value: string | undefined) => {
    setCode(value);
  };

  const handleSave = () => {
    if (code && onSave) {
      onSave(code);
      alert("코드가 서버에 저장되었습니다!");
    }
  };

  return (
    <div style={{ border: "1px solid #333", borderRadius: "8px", overflow: "hidden" }}>
      <div style={{ padding: "10px", background: "#252526", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#fff", fontSize: "14px" }}>main.{language}</span>
        <button 
          onClick={handleSave}
          style={{ padding: "5px 15px", background: "#007acc", color: "#fff", border: "none", cursor: "pointer", borderRadius: "4px" }}
        >
          저장 및 실행
        </button>
      </div>
      
      <Editor
        height="60vh"
        language={language}
        defaultValue={initialCode}
        theme="vs-dark" // VS Code 다크 모드 테마
        onChange={handleEditorChange}
        options={{
          minimap: { enabled: false }, // 미니맵 제외
          fontSize: 14,
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />
    </div>
  );
}