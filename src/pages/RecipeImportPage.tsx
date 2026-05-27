import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ParsedRecipe {
  name: string;
  ingredients: string[];
  recipe_cost: number;
  selling_price: number;
  method: string;
  glass_type: string;
  garnish: string;
  loss_factor: number;
  category: string;
  outlet_id: string;
}

interface ImportResult {
  success: boolean;
  inserted: number;
  total: number;
  errors: string[];
}

export function RecipeImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [recipes, setRecipes] = useState<ParsedRecipe[]>([]);
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
    setRecipes([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Read first sheet (clean format)
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

        if (!rows || rows.length < 2) {
          setParseError('No data found in file.');
          return;
        }

        const parsed: ParsedRecipe[] = [];

        // Row 0 = headers, start from row 1
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[0]) continue;

          const name = String(row[0] || '').trim();
          const ingredientsRaw = String(row[1] || '').trim();
          const cost = parseFloat(String(row[2] || '0'));
          const selling = parseFloat(String(row[3] || '0'));
          const method = String(row[4] || '').trim();
          const glass = String(row[5] || '').trim();
          const garnish = String(row[6] || '').trim();
          const lossFactor = parseFloat(String(row[7] || '0.05'));

          if (!name || isNaN(cost) || isNaN(selling)) continue;

          // Split ingredients by comma
          const ingredients = ingredientsRaw
            .split(',')
            .map((ing) => ing.trim())
            .filter(Boolean);

          parsed.push({
            name,
            ingredients,
            recipe_cost: cost,
            selling_price: selling,
            method,
            glass_type: glass,
            garnish,
            loss_factor: isNaN(lossFactor) ? 0.05 : lossFactor,
            category: 'cocktail',
            outlet_id: 'default',
          });
        }

        if (parsed.length === 0) {
          setParseError('No valid recipes found. Check file format.');
          return;
        }

        setRecipes(parsed);
      } catch (err) {
        setParseError('Failed to parse file: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const handleImport = async () => {
    if (!recipes.length) return;
    setImporting(true);
    setResult(null);

    try {
      const { error } = await supabase.from('recipes').insert(
        recipes.map((r) => ({
          name: r.name,
          category: r.category,
          outlet_id: r.outlet_id,
          ingredients: r.ingredients,
          recipe_cost: r.recipe_cost,
          selling_price: r.selling_price,
          method: r.method,
          glass_type: r.glass_type,
          garnish: r.garnish,
          loss_factor: r.loss_factor,
        }))
      );

      if (error) {
        setResult({
          success: false,
          inserted: 0,
          total: recipes.length,
          errors: [error.message],
        });
      } else {
        setResult({
          success: true,
          inserted: recipes.length,
          total: recipes.length,
          errors: [],
        });
      }
    } catch (err) {
      setResult({
        success: false,
        inserted: 0,
        total: recipes.length,
        errors: [err instanceof Error ? err.message : 'Unknown error'],
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
          Import Cocktail Recipes
        </h1>
        <p className="text-zinc-400 mt-2">
          Upload your clean recipe Excel file to import all cocktail recipes with costs
        </p>
      </div>

      <div className="luxury-card space-y-6">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-3">
            Select Excel File
          </label>
          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-zinc-700 rounded-xl cursor-pointer hover:border-amber-500/50 transition-colors bg-[#0a0a0b]">
            <Upload className="h-8 w-8 text-zinc-500 mb-3" />
            {file ? (
              <>
                <span className="text-white font-medium">{file.name}</span>
                <span className="text-zinc-500 text-sm mt-1">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </>
            ) : (
              <>
                <span className="text-zinc-400">Click to upload Excel file</span>
                <span className="text-zinc-600 text-sm mt-1">.xlsx or .xls</span>
              </>
            )}
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>

        {/* Parse Error */}
        {parseError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {parseError}
          </div>
        )}

        {/* Preview */}
        {recipes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-300 text-sm">
                Ready to import: <span className="text-amber-400 font-semibold">{recipes.length} recipes</span>
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
                {recipes.map((recipe, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-[#0a0a0b] border border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-medium">{recipe.name}</span>
                      <span className="text-amber-400 text-sm">
                        Cost: {recipe.recipe_cost.toFixed(2)} AED | Selling: {recipe.selling_price} AED
                      </span>
                    </div>
                    <p className="text-zinc-500 text-xs mt-1 truncate">
                      {recipe.ingredients.slice(0, 4).join(', ')}
                      {recipe.ingredients.length > 4 ? ` +${recipe.ingredients.length - 4} more` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Import Button */}
        {recipes.length > 0 && !result && (
          <button
            onClick={handleImport}
            disabled={importing}
            className="luxury-button w-full"
          >
            {importing ? 'Importing...' : `Import ${recipes.length} Recipes`}
          </button>
        )}

        {/* Result */}
        {result && (
          <div
            className={`p-4 rounded-xl border ${
              result.success
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-rose-500/10 border-rose-500/20'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              ) : (
                <XCircle className="h-5 w-5 text-rose-400" />
              )}
              <span className={result.success ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                {result.success
                  ? `Successfully imported ${result.inserted} recipes`
                  : `Import failed`}
              </span>
            </div>
            {result.errors.length > 0 && (
              <ul className="text-rose-400 text-sm space-y-1 mt-2">
                {result.errors.map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
