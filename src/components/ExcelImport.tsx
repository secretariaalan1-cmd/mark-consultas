import { useRef } from 'react';
import { Upload } from 'lucide-react';

interface Props {
  onImport: (file: ArrayBuffer) => void;
}

export function ExcelImport({ onImport }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    onImport(buffer);
    if (ref.current) ref.current.value = '';
  };

  return (
    <>
      <input ref={ref} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
      <button
        onClick={() => ref.current?.click()}
        className="flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-card slot-shadow hover:slot-shadow-hover transition-all text-foreground"
      >
        <Upload className="w-4 h-4" />
        Importar Excel
      </button>
    </>
  );
}
