import React, { useState, useRef } from 'react';
import { AlertTriangle, X, Upload, Check } from 'lucide-react';
import { EthicalPrinciple } from '../types';
import { EthicalTensionSelector } from './EthicalTensionSelector';

interface AddTensionModalProps {
  onClose: () => void;
  onSave: (data: any) => void;
}

export function AddTensionModal({ onClose, onSave }: AddTensionModalProps) {
  const [principle1, setPrinciple1] = useState<EthicalPrinciple | undefined>();
  const [principle2, setPrinciple2] = useState<EthicalPrinciple | undefined>();
  
  const [claim, setClaim] = useState('');
  const [argument, setArgument] = useState('');
  const [evidence, setEvidence] = useState('');
  const [severity, setSeverity] = useState<number>(2);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Dosyayı Base64'e çeviren yardımcı fonksiyon
  const convertBase64 = (file: File) => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = () => resolve(fileReader.result);
      fileReader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (principle1 && principle2 && claim && argument) {
      let fileData = null;
      
      // Dosya varsa dönüştür
      if (selectedFile) {
        try {
            fileData = await convertBase64(selectedFile);
        } catch (error) {
            console.error("File conversion error", error);
        }
      }

      onSave({
        principle1,
        principle2,
        claimStatement: claim,
        description: argument,
        evidenceDescription: evidence,
        evidenceFileName: selectedFile ? selectedFile.name : undefined,
        evidenceFileData: fileData, // Dönüştürülmüş veriyi gönderiyoruz
        severity: severity
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <AlertTriangle className="h-5 w-5 text-gray-700 mr-2" />
            Add Ethical Tension
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <EthicalTensionSelector
            principle1={principle1}
            principle2={principle2}
            onPrinciple1Change={setPrinciple1}
            onPrinciple2Change={setPrinciple2}
          />

          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">Claim *</label>
            <input type="text" value={claim} onChange={(e) => setClaim(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="State the core conflict briefly..." required />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">Argument *</label>
            <textarea value={argument} onChange={(e) => setArgument(e.target.value)} rows={3} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Explain your reasoning..." required />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">Evidence (Optional)</label>
            <textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} rows={2} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mb-2" placeholder="Describe supporting evidence..." />
            
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className={`flex items-center text-sm px-3 py-1.5 rounded-md border transition-colors ${selectedFile ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-600 hover:text-blue-600 bg-gray-50'}`}>
              {selectedFile ? <><Check className="h-4 w-4 mr-2" />{selectedFile.name}</> : <><Upload className="h-4 w-4 mr-2" /> Upload File</>}
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-3 text-gray-700">Severity Level</label>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSeverity(level)}
                  className={`py-3 px-4 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                    severity === level 
                      ? (level === 1 ? 'border-green-500 bg-green-50 text-green-700' : level === 2 ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-red-500 bg-red-50 text-red-700') + ' font-bold'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full mb-1 ${severity === level ? (level === 1 ? 'bg-green-500' : level === 2 ? 'bg-yellow-500' : 'bg-red-500') : 'bg-gray-300'}`} />
                  {level === 1 ? 'Low' : level === 2 ? 'Medium' : 'High'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-600 hover:text-gray-900">Cancel</button>
            <button type="submit" disabled={!principle1 || !principle2 || !claim || !argument} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Save Tension</button>
          </div>
        </form>
      </div>
    </div>
  );
}