import React, { useState, useRef } from 'react';
import { AlertTriangle, X, Upload, Check, ChevronDown, ChevronUp, Info } from 'lucide-react';
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
  const [evidenceType, setEvidenceType] = useState('');
  const [severity, setSeverity] = useState<number>(2);
  const [showSeverityTooltip, setShowSeverityTooltip] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Impact & Stakeholders
  const [impactAreas, setImpactAreas] = useState<string[]>([]);
  const [affectedGroups, setAffectedGroups] = useState<string[]>([]);
  const [impactDescription, setImpactDescription] = useState('');
  const [showImpactSection, setShowImpactSection] = useState(true);

  // Mitigation & Resolution
  const [proposedMitigations, setProposedMitigations] = useState('');
  const [tradeoffDecision, setTradeoffDecision] = useState('Prioritize Principle 1');
  const [tradeoffRationale, setTradeoffRationale] = useState('');
  const [showMitigationSection, setShowMitigationSection] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const impactAreaOptions = [
    'Privacy & Data Protection',
    'Safety',
    'Fairness / Non-discrimination',
    'Transparency',
    'Human Autonomy / Oversight',
    'Security / Misuse',
    'Access / Inclusion',
    'Accountability / Governance'
  ];

  const affectedGroupOptions = [
    'End users',
    'Non-users affected by outcomes',
    'Vulnerable groups (minors, elderly, disabled, etc.)',
    'Employees/operators',
    'Organizations/clients',
    'General public'
  ];

  const toggleImpactArea = (area: string) => {
    setImpactAreas(prev => 
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const toggleAffectedGroup = (group: string) => {
    setAffectedGroups(prev => 
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

  // Dosyayı Base64'e çeviren yardımcı fonksiyon
  const convertBase64 = (file: File): Promise<string | ArrayBuffer | null> => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = () => resolve(fileReader.result);
      fileReader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (principle1 && principle2 && claim && argument && proposedMitigations) {
      // Validate tradeoff rationale if decision is not "Undecided"
      if (tradeoffDecision !== 'Undecided' && !tradeoffRationale) {
        alert('Please provide a rationale for your trade-off decision.');
        return;
      }

      let fileData: string | ArrayBuffer | null = null;
      
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
        evidenceType: evidenceType || undefined,
        evidenceFileName: selectedFile ? selectedFile.name : undefined,
        evidenceFileData: fileData,
        severity: severity,
        impact: {
          areas: impactAreas,
          affectedGroups: affectedGroups,
          description: impactDescription || undefined
        },
        mitigation: {
          proposed: proposedMitigations,
          tradeoff: {
            decision: tradeoffDecision,
            rationale: tradeoffRationale || undefined
          }
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="text-xl font-black text-gray-900 flex items-center">
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
            <label className="block text-sm font-bold mb-1 text-gray-700">Claim *</label>
            <input type="text" value={claim} onChange={(e) => setClaim(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="State the core conflict briefly..." required />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1 text-gray-700">Argument *</label>
            <textarea value={argument} onChange={(e) => setArgument(e.target.value)} rows={3} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Explain your reasoning..." required />
          </div>

          <div>
            <div className="mb-3">
              <label className="block text-sm font-bold mb-1 text-gray-700">Evidence Type (Optional)</label>
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select evidence type…</option>
                <option value="Policy / Standard">Policy / Standard</option>
                <option value="Test / Evaluation">Test / Evaluation</option>
                <option value="User feedback">User feedback</option>
                <option value="Logs / Telemetry">Logs / Telemetry</option>
                <option value="Incident report">Incident report</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <label className="block text-sm font-bold mb-1 text-gray-700">Evidence (Optional)</label>
            <textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} rows={2} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mb-2" placeholder="Describe supporting evidence..." />
            
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className={`flex items-center text-sm px-3 py-1.5 rounded-md border transition-colors ${selectedFile ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-600 hover:text-blue-600 bg-gray-50'}`}>
              {selectedFile ? <><Check className="h-4 w-4 mr-2" />{selectedFile.name}</> : <><Upload className="h-4 w-4 mr-2" /> Upload File</>}
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <label className="block text-sm font-bold text-gray-700">Severity Level</label>
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setShowSeverityTooltip(true)}
                  onMouseLeave={() => setShowSeverityTooltip(false)}
                  onClick={() => setShowSeverityTooltip(!showSeverityTooltip)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <Info className="h-4 w-4" />
                </button>
                {showSeverityTooltip && (
                  <div className="absolute z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg left-0 bottom-full mb-2">
                    <div className="font-semibold mb-1">Severity</div>
                    <div>Severity reflects impact magnitude if the issue occurs. It does not include likelihood (probability).</div>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-3">Severity = impact magnitude (not likelihood)</p>
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

          {/* Impact & Stakeholders Section */}
          <div className="border-t border-gray-200 pt-5">
            <button
              type="button"
              onClick={() => setShowImpactSection(!showImpactSection)}
              className="w-full flex items-center justify-between text-left mb-4"
            >
              <h3 className="text-lg font-bold text-gray-900">Impact & Stakeholders</h3>
              {showImpactSection ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
            </button>
            
            {showImpactSection && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">Impact Area *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {impactAreaOptions.map((area) => (
                      <label key={area} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={impactAreas.includes(area)}
                          onChange={() => toggleImpactArea(area)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{area}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">Affected Groups *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {affectedGroupOptions.map((group) => (
                      <label key={group} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={affectedGroups.includes(group)}
                          onChange={() => toggleAffectedGroup(group)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{group}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">Impact Description (Optional)</label>
                  <textarea
                    value={impactDescription}
                    onChange={(e) => setImpactDescription(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Who is impacted and how? (1–2 sentences)"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Mitigation / Resolution Section */}
          <div className="border-t border-gray-200 pt-5">
            <button
              type="button"
              onClick={() => setShowMitigationSection(!showMitigationSection)}
              className="w-full flex items-center justify-between text-left mb-4"
            >
              <h3 className="text-lg font-bold text-gray-900">Mitigation / Resolution</h3>
              {showMitigationSection ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
            </button>
            
            {showMitigationSection && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">Proposed Mitigations *</label>
                  <textarea
                    value={proposedMitigations}
                    onChange={(e) => setProposedMitigations(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="List proposed mitigations as bullet points…"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">e.g., add human review; add warnings; restrict use cases; improve dataset coverage…</p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">Trade-off Decision *</label>
                  <select
                    value={tradeoffDecision}
                    onChange={(e) => setTradeoffDecision(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="Prioritize Principle 1">Prioritize Principle 1</option>
                    <option value="Prioritize Principle 2">Prioritize Principle 2</option>
                    <option value="Balanced / conditional">Balanced / conditional</option>
                    <option value="Undecided">Undecided</option>
                  </select>
                </div>

                {tradeoffDecision !== 'Undecided' && (
                  <div>
                    <label className="block text-sm font-bold mb-1 text-gray-700">Trade-off Rationale *</label>
                    <textarea
                      value={tradeoffRationale}
                      onChange={(e) => setTradeoffRationale(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Why this trade-off?"
                      required
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-600 hover:text-gray-900">Cancel</button>
            <button type="submit" disabled={!principle1 || !principle2 || !claim || !argument || !proposedMitigations || (tradeoffDecision !== 'Undecided' && !tradeoffRationale)} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Save Tension</button>
          </div>
        </form>
      </div>
    </div>
  );
}