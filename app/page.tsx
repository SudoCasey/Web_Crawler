'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Container,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Snackbar,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

interface CrawlResult {
  url: string;
  screenshot?: string;
  links: string[];
  error?: string;
}

interface ScanResult {
  results: CrawlResult[];
  usedSitemap: boolean | null;
  tookScreenshots: boolean;
}

interface TimerDisplayProps {
  isLoading: boolean;
  elapsed: number;
  formatTime: (seconds: number) => string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [takeScreenshots, setTakeScreenshots] = useState(false);
  const [crawlEntireWebsite, setCrawlEntireWebsite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [isCrawlComplete, setIsCrawlComplete] = useState(false);
  const [isCrawlCancelled, setIsCrawlCancelled] = useState(false);
  const [elapsed, setElapsed] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);


  const TimerDisplay = React.memo(({ isLoading, elapsed, formatTime }: TimerDisplayProps) => {
    if (!isLoading && elapsed === 0) return null;
    
    return (
      <Box sx={{ mb: 2 }}>
        <Alert severity="info">
          {isLoading
            ? `Crawl running: ${formatTime(elapsed)}`
            : isCrawlCancelled ? `Crawl cancelled after ${formatTime(elapsed)}` : `Crawl completed in ${formatTime(elapsed)}`}
        </Alert>
      </Box>
    );
  });
  
  TimerDisplay.displayName = 'TimerDisplay';

  // Format seconds as HH:MM:SS
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // Stop timer helper
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Start timer helper
  const startTimer = () => {
    stopTimer(); // Ensure any existing timer is stopped first
    startTimeRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => stopTimer();
  }, []);

  const getUniqueLinks = (links: string[]): string[] => {
    return Array.from(new Set(links));
  };

  const handleCancel = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    stopTimer();
    if (startTimeRef.current) {
      const finalElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(finalElapsed);
      startTimeRef.current = null;
    }
    setIsCrawlComplete(true);
    setIsCrawlCancelled(true);
  };

  const handleCrawl = async () => {
    if (!url) return;

    setIsLoading(true);
    setScanResult(null);
    setShowCompletion(false);
    setIsCrawlComplete(false);
    setIsCrawlCancelled(false);
    startTimer();

    // Create new AbortController for this crawl
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          takeScreenshots,
          crawlEntireWebsite,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let buffer = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += new TextDecoder().decode(value);
          
          // Process complete JSON objects from the buffer
          let startIndex = 0;
          let endIndex;
          
          while ((endIndex = buffer.indexOf('\n', startIndex)) !== -1) {
            const jsonStr = buffer.slice(startIndex, endIndex);
            try {
              const data = JSON.parse(jsonStr);
              setScanResult({
                results: data.results.map((result: CrawlResult) => ({
                  ...result,
                  isCrawling: !data.isComplete
                })),
                usedSitemap: data.usedSitemap,
                tookScreenshots: takeScreenshots
              });
              
              if (data.isComplete) {
                if (startTimeRef.current) {
                  const finalElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
                  setElapsed(finalElapsed);
                  startTimeRef.current = null;
                }
                stopTimer();
                setShowCompletion(true);
                setIsCrawlComplete(true);
                setIsLoading(false);
              }
            } catch (e) {
              console.error('Error parsing JSON:', e);
            }
            startIndex = endIndex + 1;
          }
          
          // Keep the remaining partial data in the buffer
          buffer = buffer.slice(startIndex);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Crawl cancelled by user');
        } else {
          throw error;
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Crawl cancelled by user');
      } else {
        console.error('Error crawling website:', error);
      }
    } finally {
      setIsLoading(false);
      stopTimer();
      startTimeRef.current = null;
      abortControllerRef.current = null;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Web Crawler
          </Typography>

          <Box component="form" sx={{ mb: 4 }}>
            <TextField
              fullWidth
              label="Website URL"
              variant="outlined"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={takeScreenshots}
                  onChange={(e) => setTakeScreenshots(e.target.checked)}
                />
              }
              label="Take screenshots"
              sx={{ mb: 1 }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={crawlEntireWebsite}
                  onChange={(e) => setCrawlEntireWebsite(e.target.checked)}
                />
              }
              label="Crawl entire website"
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleCrawl}
                disabled={isLoading || !url}
                fullWidth
              >
                {isLoading ? <CircularProgress size={24} /> : 'Crawl'}
              </Button>
              
              {isLoading && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleCancel}
                  fullWidth
                >
                  Cancel
                </Button>
              )}
            </Box>
          </Box>

          <TimerDisplay 
            isLoading={isLoading}
            elapsed={elapsed}
            formatTime={formatTime}
          />

          {scanResult && (
            <Box sx={{ mt: 2 }}>
              {scanResult.results.length > 0 && (
                <>
                  {scanResult.usedSitemap !== null && scanResult.results.length > 1 && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Pages were discovered using {scanResult.usedSitemap ? 'sitemap.xml' : 'recursive link discovery'}
                    </Alert>
                  )}
                  {scanResult.tookScreenshots ? (
                    <Accordion defaultExpanded>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <Typography>Scanned Pages ({scanResult.results.length})</Typography>
                          {isLoading && (
                            <CircularProgress size={20} sx={{ ml: 2 }} />
                          )}
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        {scanResult.results.map((result, index) => (
                          <Accordion key={index}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                <Typography sx={{ wordBreak: 'break-all' }}>{result.url}</Typography>
                                {result.error && (
                                  <Typography color="error" sx={{ ml: 2 }}>
                                    (Error: {result.error})
                                  </Typography>
                                )}
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                              {result.screenshot && (
                                <Box sx={{ mt: 2 }}>
                                  <Typography variant="h6" gutterBottom>Screenshot:</Typography>
                                  <img 
                                    src={result.screenshot} 
                                    alt={`Screenshot of ${result.url}`}
                                    style={{ maxWidth: '100%', height: 'auto' }}
                                  />
                                </Box>
                              )}
                              {result.links.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                  <Typography variant="h6" gutterBottom>
                                    New unique links found ({result.links.length}):
                                  </Typography>
                                  <List>
                                    {result.links.map((link, linkIndex) => (
                                      <ListItem key={linkIndex}>
                                        <ListItemText 
                                          primary={link}
                                          sx={{ wordBreak: 'break-all' }}
                                        />
                                      </ListItem>
                                    ))}
                                  </List>
                                </Box>
                              )}
                            </AccordionDetails>
                          </Accordion>
                        ))}
                      </AccordionDetails>
                    </Accordion>
                  ) : (
                    <List>
                      {scanResult.results.map((result, index) => (
                        <React.Fragment key={index}>
                          <ListItem>
                            <ListItemText 
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Typography sx={{ wordBreak: 'break-all' }}>{result.url}</Typography>
                                  {result.error && (
                                    <Typography color="error" sx={{ ml: 2 }}>
                                      (Error: {result.error})
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                          </ListItem>
                          {index < scanResult.results.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </>
              )}
            </Box>
          )}

          <Snackbar
            open={showCompletion}
            autoHideDuration={6000}
            onClose={() => setShowCompletion(false)}
            message="Website scan completed!"
          />
        </Paper>
      </Container>
    </ThemeProvider>
  );
} 