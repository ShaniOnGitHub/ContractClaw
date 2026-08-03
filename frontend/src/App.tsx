import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ChatCanvas } from './components/ChatCanvas';
import { ComparisonLab } from './components/ComparisonLab';
import { FloatingInputBar } from './components/FloatingInputBar';
import { 
  getSamples, 
  selectSample, 
  uploadPdf, 
  queryRetriever, 
  compareRetrievers
} from './services/api';
import type { QueryResponse, CompareResponse } from './services/api';

export const App: React.FC = () => {
  const [samples, setSamples] = useState<string[]>([]);
  const [activeSample, setActiveSample] = useState<string>('sample_nda.pdf');
  const [activeMode, setActiveMode] = useState<string>('Similarity Search');
  
  const [k, setK] = useState<number>(3);
  const [lambdaMult, setLambdaMult] = useState<number>(0.5);
  const [fullContext, setFullContext] = useState<boolean>(true);

  const [userQuery, setUserQuery] = useState<string>('What are the termination clauses, liability caps, and payment obligations?');
  const [response, setResponse] = useState<QueryResponse | null>(null);
  
  // Compare Mode state
  const [compareModeA, setCompareModeA] = useState<string>('Similarity Search');
  const [compareModeB, setCompareModeB] = useState<string>('MMR (Diversity Mode)');
  const [compareData, setCompareData] = useState<CompareResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Initial load: fetch sample list and initialize first sample contract
  useEffect(() => {
    const init = async () => {
      try {
        const sampleList = await getSamples();
        setSamples(sampleList);
        if (sampleList.length > 0) {
          const firstSample = sampleList[0];
          setActiveSample(firstSample);
          await selectSample(firstSample);
          handleExecuteQuery(userQuery, activeMode);
        }
      } catch (err) {
        console.error('Failed to load sample contracts:', err);
      }
    };
    init();
  }, []);

  const handleSelectSample = async (filename: string) => {
    setActiveSample(filename);
    setIsLoading(true);
    try {
      await selectSample(filename);
      await handleExecuteQuery(userQuery, activeMode);
    } catch (err) {
      console.error('Failed to select sample contract:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    try {
      const res = await uploadPdf(file);
      setActiveSample(res.metadata.filename);
      await handleExecuteQuery(userQuery, activeMode);
    } catch (err) {
      console.error('Failed to upload PDF contract:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteQuery = async (queryText: string, mode: string) => {
    setIsLoading(true);
    setUserQuery(queryText);
    try {
      if (mode === 'Compare Modes Lab') {
        const compRes = await compareRetrievers(queryText, compareModeA, compareModeB, k, lambdaMult, fullContext);
        setCompareData(compRes);
      } else {
        const res = await queryRetriever(queryText, mode, k, lambdaMult, fullContext);
        setResponse(res);
      }
    } catch (err) {
      console.error('Query execution failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectMode = (mode: string) => {
    setActiveMode(mode);
    handleExecuteQuery(userQuery, mode);
  };

  return (
    <div className="app-layout">
      {/* Left Sidebar */}
      <Sidebar
        samples={samples}
        activeSample={activeSample}
        onSelectSample={handleSelectSample}
        activeMode={activeMode}
        onSelectMode={handleSelectMode}
        onFileUpload={handleFileUpload}
      />

      {/* Main Canvas Area */}
      <div className="main-canvas">
        <Header
          activeSample={activeSample}
          activeMode={activeMode}
          k={k}
          setK={setK}
          lambdaMult={lambdaMult}
          setLambdaMult={setLambdaMult}
          fullContext={fullContext}
          setFullContext={setFullContext}
        />

        {activeMode === 'Compare Modes Lab' ? (
          <div className="chat-scroll-area">
            <ComparisonLab
              data={compareData}
              modeA={compareModeA}
              setModeA={(m: string) => { setCompareModeA(m); handleExecuteQuery(userQuery, 'Compare Modes Lab'); }}
              modeB={compareModeB}
              setModeB={(m: string) => { setCompareModeB(m); handleExecuteQuery(userQuery, 'Compare Modes Lab'); }}
              isLoading={isLoading}
            />
          </div>
        ) : (
          <ChatCanvas
            userQuery={userQuery}
            response={response}
            isLoading={isLoading}
          />
        )}

        {/* Floating Input Bar matching User Reference */}
        <FloatingInputBar
          onSendQuery={(q: string) => handleExecuteQuery(q, activeMode)}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default App;
