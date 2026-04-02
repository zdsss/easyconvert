import { useState } from 'react';
import { useStore } from '@lib/store/parseStore';

export default function JsonEditor() {
  const { resume, setResume } = useStore();
  const [error, setError] = useState('');

  const handleChange = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      setResume(parsed);
      setError('');
    } catch {
      setError('JSON格式错误');
    }
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-2">编辑简历数据</h2>
      <textarea
        value={JSON.stringify(resume, null, 2)}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full h-96 p-4 border rounded font-mono text-sm"
      />
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}
