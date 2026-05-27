import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ParsedIngredient {
  name: string;
  category: string;
  supplier: string;
  bottle_size: number;
  unit_cost: number;
  cost_per_ml: number;
  sgl_shot_cost: number;
  sgl_shot_selling_price: number;
  dbl_shot_cost: number;
  dbl_shot_selling_price: number;
  bottle_selling_price: number;
  source_sheet: string;
}

interface ImportResult {
  success: boolean;
  inserted: number;
  total: number;
  errors: string[];
}

export function IngredientImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [ingredients, setIngredients] = useState<ParsedIngredient[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);
    setParseError(null);
    setIngredients([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

        if (!rows || rows.length < 2) {
          setParseError('No data found in file.');
          return;
        }

        const parsed: ParsedIngredient[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[0]) continue;

          const name = String(row[0] || '').trim();
          const category = String(row[1] || 'Other').trim();
          const supplier = String(row[2] || '').trim();
          const bottleSize = parseFloat(String(row[3] || '0'));
          const unitCost = parseFloat(String(row[4] || '0'));
          const costPerMl = parseFloat(String(row[5] || '0'));
          const sglShotCost = parseFloat(String(row[6] || '0'));
          const sglShotSelling = parseFloat(String(row[7] || '0'));
          const dblShotCost = parseFloat(String(row[8] || '0'));
          const dblShotSelling = parseFloat(String(row[9] || '0'));
          const bottleSelling = parseFloat(String(row[10] || '0'));
          const sourceSheet = String(row[11] || '').trim();

          if (!name) continue;

          parsed.push({
            name,
            category,
            supplier,
            bottle_size: isNaN(bottleSize) ? 0 : bottleSize,
            unit_cost: isNaN(unitCost) ? 0 : unitCost,
            cost_per_ml: isNaN(costPerMl) ? 0 : costPerMl,
            sgl_shot_cost: isNaN(sglShotCost) ? 0 : sglShotCost,
            sgl_shot_selling_price: isNaN(sglShotSelling) ? 0 : sglShotSelling,
            dbl_shot_cost: isNaN(dblShotCost) ? 0 : dblShotCost,
            dbl_shot_selling_price: isNaN(dblShotSelling) ? 0 : dblShotSelling,
            bottle_selling_price: isNaN(bottleSelling) ? 0 : bottleSelling,
            source_sheet: sourceSheet,
          });
        }

        if (parsed.length === 0) {
          setParseError('No valid ingredients found. Check file format.');
          return;
        }

        setIngredients(parsed);
      } catch (err) {
        setParseError('Failed to parse file: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const handleImport = async () => {
    if (!ingredients.length) return;
    setImporting(true);
    setResult(null);

    try {
      const { error } = await supabase.from('ingredients').insert(ingredients);

      if (error) {
        setResult({ success: false, inserted: 0, total: ingredients.length, errors: [error.message] });
      } else {
        setResult({ success: true, inserted: ingredients.length, total: ingredients.length, errors: [] });
      }
    } catch (err) {
      setResult({
        success: false,
        inserted: 0,
        total: ingredients.length,
        errors: [err instanceof Error ? err.message : 'Unknown error'],
      });
    } finally {
      setImporting(false);
    }
  };

  const categoryColors: Record<string, string> = {
    Spirit: 'text-amber-400',
    Liqueur: 'text-purple-400',
    Beer: 'text-yellow-400',
    Wine: 'text-rose-400',
    Other: 'text-zinc-400',
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
          Import Ingredients
        </h1>
        <p className="text-zinc-400 mt-2">
          Upload your clean ingredients Excel file to import all spirits, liqueurs, beers and other items
        </p>
      </div>

      <div className="luxury-card space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-3">Select Excel File</label>
          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-zinc-700 rounded-xl cursor-pointer hover:border-amber-500/50 transition-colors bg-[#0a0a0b]">
            <Upload className="h-8 w-8 text-zinc-500 mb-3" />
            {file ? (
              <>
                <span className="text-white font-medium">{file.name}</span>
                <span className="text-zinc-500 text-sm mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </>
            ) : (
              <>
                <span className="text-zinc-400">Click to upload Excel file</span>
                <span className="text-zinc-600 text-sm mt-1">.xlsx or .xls</span>
              </>
            )}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
          </label>
        </div>

        {parseError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {parseError}
          </div>
        )}

        {ingredients.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-300 text-sm">
                Ready to import: <span className="text-amber-400 font-semibold">{ingredients.length} ingredients</span>
              </span>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPreview ? 'Hide' : 'Preview'}
              </button>
            </div>

            {showPreview && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {ingredients.map((ing, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-[#0a0a0b] border border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-medium">{ing.name}</span>
                      <span className={`text-xs font-medium ${categoryColors[ing.category] || 'text-zinc-400'}`}>
                        {ing.category}
                      </span>
                    </div>
                    <p className="text-zinc-500 text-xs mt-1">
                      {ing.supplier} · {ing.bottle_size}ml · AED {ing.unit_cost.toFixed(2)} · AED {ing.cost_per_ml.toFixed(4)}/ml
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {ingredients.length > 0 && !result && (
          <button onClick={handleImport} disabled={importing} className="luxury-button w-full">
            {importing ? 'Importing...' : `Import ${ingredients.length} Ingredients`}
          </button>
        )}

        {result && (
          <div className={`p-4 rounded-xl border ${result.success ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
            <div className="flex items-center gap-3 mb-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              ) : (
                <XCircle className="h-5 w-5 text-rose-400" />
              )}
              <span className={result.success ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                {result.success ? `Successfully imported ${result.inserted} ingredients` : `Import failed`}
              </span>
            </div>
            {result.errors.length > 0 && (
              <ul className="text-rose-400 text-sm space-y-1 mt-2">
                {result.errors.map((err, i) => <li key={i}>• {err}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
