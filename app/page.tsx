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

// WCAG 2.2 Success Criterion mapping
const WCAG_MAPPING: { [key: string]: { name: string; sc: string; level: 'A' | 'AA' | 'AAA'; url: string } } = {
  'accesskeys': { name: 'Keyboard', sc: '2.1.4', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html' },
  'aria-allowed-attr': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'aria-allowed-role': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'aria-command-name': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'aria-conditional-attr': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'aria-deprecated-role': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'aria-hidden-body': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'aria-hidden-focus': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'aria-input-field-name': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'aria-meter-name': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'aria-progressbar-name': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'aria-prohibited-attr': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'aria-required-attr': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'aria-required-children': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'aria-required-parent': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'aria-roledescription': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'aria-roles': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'aria-text': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'aria-toggle-field-name': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'aria-tooltip-name': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'aria-treeitem-name': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'aria-valid-attr': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'aria-valid-attr-value': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'button-name': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'bypass': { name: 'Bypass Blocks', sc: '2.4.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html' },
  'color-contrast': { name: 'Contrast (Minimum)', sc: '1.4.3', level: 'AA', url: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html' },
  'document-title': { name: 'Page Titled', sc: '2.4.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/page-titled.html' },
  'duplicate-id': { name: 'Parsing', sc: '4.1.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/parsing.html' },
  'duplicate-id-active': { name: 'Parsing', sc: '4.1.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/parsing.html' },
  'duplicate-id-aria': { name: 'Parsing', sc: '4.1.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/parsing.html' },
  'form-field-multiple-labels': { name: 'Labels or Instructions', sc: '3.3.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html' },
  'frame-title': { name: 'Frame Title', sc: '2.4.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/frame-titled.html' },
  'frame-tested': { name: 'Frame Title', sc: '2.4.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/frame-titled.html' },
  'heading-order': { name: 'Info and Relationships', sc: '1.3.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html' },
  'html-has-lang': { name: 'Language of Page', sc: '3.1.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html' },
  'html-lang-valid': { name: 'Language of Page', sc: '3.1.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html' },
  'html-xml-lang-mismatch': { name: 'Language of Page', sc: '3.1.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html' },
  'image-alt': { name: 'Non-text Content', sc: '1.1.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html' },
  'input-button-name': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'input-image-alt': { name: 'Non-text Content', sc: '1.1.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html' },
  'label': { name: 'Labels or Instructions', sc: '3.3.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html' },
  'landmark-banner-is-top-level': { name: 'Info and Relationships', sc: '1.3.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html' },
  'landmark-complementary-is-top-level': { name: 'Info and Relationships', sc: '1.3.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html' },
  'landmark-contentinfo-is-top-level': { name: 'Info and Relationships', sc: '1.3.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html' },
  'landmark-main-is-top-level': { name: 'Info and Relationships', sc: '1.3.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html' },
  'landmark-no-duplicate-banner': { name: 'Info and Relationships', sc: '1.3.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html' },
  'landmark-no-duplicate-contentinfo': { name: 'Info and Relationships', sc: '1.3.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html' },
  'landmark-no-duplicate-main': { name: 'Info and Relationships', sc: '1.3.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html' },
  'landmark-one-main': { name: 'Info and Relationships', sc: '1.3.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html' },
  'landmark-unique': { name: 'Info and Relationships', sc: '1.3.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html' },
  'link-name': { name: 'Link Purpose (In Context)', sc: '2.4.4', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html' },
  'list': { name: 'Info and Relationships', sc: '1.3.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html' },
  'listitem': { name: 'Info and Relationships', sc: '1.3.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html' },
  'marquee': { name: 'Pause, Stop, Hide', sc: '2.2.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html' },
  'meta-refresh': { name: 'Timing Adjustable', sc: '2.2.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html' },
  'meta-viewport': { name: 'Reflow', sc: '1.4.10', level: 'AA', url: 'https://www.w3.org/WAI/WCAG22/Understanding/reflow.html' },
  'meta-viewport-large': { name: 'Resize Text', sc: '1.4.4', level: 'AA', url: 'https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html' },
  'nested-interactive': { name: 'Keyboard', sc: '2.1.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html' },
  'no-autoplay-audio': { name: 'Audio Control', sc: '1.4.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html' },
  'object-alt': { name: 'Non-text Content', sc: '1.1.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html' },
  'p-as-heading': { name: 'Info and Relationships', sc: '1.3.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html' },
  'page-has-heading-one': { name: 'Info and Relationships', sc: '1.3.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html' },
  'presentation-role-conflict': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'role-img-alt': { name: 'Non-text Content', sc: '1.1.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html' },
  'scrollable-region-focusable': { name: 'Keyboard', sc: '2.1.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html' },
  'select-name': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'server-side-image-map': { name: 'Keyboard', sc: '2.1.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html' },
  'svg-img-alt': { name: 'Non-text Content', sc: '1.1.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html' },
  'td-headers-attr': { name: 'Info and Relationships', sc: '1.3.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html' },
  'th-has-data-cells': { name: 'Info and Relationships', sc: '1.3.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html' },
  'valid-lang': { name: 'Language of Parts', sc: '3.1.2', level: 'AA', url: 'https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html' },
  'video-caption': { name: 'Captions (Prerecorded)', sc: '1.2.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html' },
  'scope-attr-valid': { name: 'Info and Relationships', sc: '1.3.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html' },
  'summary-name': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'tabindex': { name: 'Keyboard', sc: '2.1.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html' },
  'table-duplicate-name': { name: 'Info and Relationships', sc: '1.3.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html' },
  'region': { name: 'Info and Relationships', sc: '1.3.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html' },
  'avoid-inline-spacing': { name: 'Text Spacing', sc: '1.4.12', level: 'AA', url: 'https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html' },
  'empty-heading': { name: 'Info and Relationships', sc: '1.3.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html' },
  'area-alt': { name: 'Non-text Content', sc: '1.1.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html' },
  'aria-braille-equivalent': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'aria-dialog-name': { name: 'Name, Role, Value', sc: '4.1.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html' },
  'autocomplete-valid': { name: 'Identify Input Purpose', sc: '1.3.5', level: 'AA', url: 'https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html' },
  'blink': { name: 'Pause, Stop, Hide', sc: '2.2.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html' },
  'definition-list': { name: 'Info and Relationships', sc: '1.3.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html' },
  'dlitem': { name: 'Info and Relationships', sc: '1.3.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html' },
  'empty-table-header': { name: 'Info and Relationships', sc: '1.3.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html' },
  'frame-focusable-content': { name: 'Keyboard', sc: '2.1.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html' },
  'frame-title-unique': { name: 'Frame Title', sc: '2.4.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/frame-titled.html' },
  'image-redundant-alt': { name: 'Non-text Content', sc: '1.1.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html' },
  'label-title-only': { name: 'Labels or Instructions', sc: '3.3.2', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html' },
  'link-in-text-block': { name: 'Link Purpose (In Context)', sc: '2.4.4', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html' },
  'skip-link': { name: 'Bypass Blocks', sc: '2.4.1', level: 'A', url: 'https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html' },
};

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
  components: {
    MuiAccordion: {
      styleOverrides: {
        root: {
          '&.Mui-expanded': {
            margin: '8px 0',
            '&:before': {
              opacity: 1,
            },
          },
          '&:before': {
            opacity: 1,
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          '&.Mui-expanded': {
            minHeight: 48,
          },
        },
      },
    },
  },
});

interface CrawlResult {
  url: string;
  screenshot?: string;
  links: string[];
  error?: string;
  accessibilityResults?: {
    violations: Array<{
      id: string;
      impact: string;
      description: string;
      help: string;
      helpUrl: string;
      tags: string[];
      nodes: Array<{
        html: string;
        target: string[];
        failureSummary: string;
      }>;
    }>;
    passes: Array<{
      id: string;
      impact: string;
      description: string;
      help: string;
      helpUrl: string;
      tags: string[];
    }>;
    incomplete: Array<{
      id: string;
      impact: string;
      description: string;
      help: string;
      helpUrl: string;
      tags: string[];
    }>;
    nonApplicable?: Array<{
      id: string;
      impact: string;
      description: string;
      help: string;
      helpUrl: string;
      tags: string[];
    }>;
  };
}

interface ScanResult {
  results: CrawlResult[];
  usedSitemap: boolean | null;
  tookScreenshots: boolean;
  checkedAccessibility: boolean;
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
  const [checkAccessibility, setCheckAccessibility] = useState(false);
  const [showLinkDiscovery, setShowLinkDiscovery] = useState(false);
  const [wcagLevelA, setWcagLevelA] = useState(true);
  const [wcagLevelAA, setWcagLevelAA] = useState(true);
  const [wcagLevelAAA, setWcagLevelAAA] = useState(false);
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
          checkAccessibility,
          wcagLevels: {
            A: wcagLevelA,
            AA: wcagLevelAA,
            AAA: wcagLevelAAA,
          },
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
                tookScreenshots: takeScreenshots,
                checkedAccessibility: data.checkedAccessibility
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
                  checked={showLinkDiscovery}
                  onChange={(e) => setShowLinkDiscovery(e.target.checked)}
                />
              }
              label="Show link discovery information"
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
              sx={{ mb: 1 }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={checkAccessibility}
                  onChange={(e) => setCheckAccessibility(e.target.checked)}
                />
              }
              label="Check WCAG Accessibility"
              sx={{ mb: 1 }}
            />

            {checkAccessibility && (
              <Box sx={{ ml: 4, mb: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={wcagLevelA}
                      onChange={(e) => setWcagLevelA(e.target.checked)}
                    />
                  }
                  label="Level A"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={wcagLevelAA}
                      onChange={(e) => setWcagLevelAA(e.target.checked)}
                    />
                  }
                  label="Level AA"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={wcagLevelAAA}
                      onChange={(e) => setWcagLevelAAA(e.target.checked)}
                    />
                  }
                  label="Level AAA"
                />
              </Box>
            )}

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
                          <Accordion 
                            key={index}
                            sx={{
                              '&.Mui-expanded': {
                                backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                borderLeft: '4px solid #1976d2',
                              },
                            }}
                          >
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
                                  <Accordion defaultExpanded>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                      <Typography variant="h6">Screenshot</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                      <img 
                                        src={result.screenshot} 
                                        alt={`Screenshot of ${result.url}`}
                                        style={{ maxWidth: '100%', height: 'auto' }}
                                      />
                                    </AccordionDetails>
                                  </Accordion>
                                </Box>
                              )}
                              {result.accessibilityResults && (
                                <Box sx={{ mt: 2 }}>
                                  <Typography variant="h6" gutterBottom>Accessibility Results:</Typography>
                                  
                                  {/* Violations Section */}
                                  <Accordion 
                                    defaultExpanded={false}
                                    sx={{
                                      '&.Mui-expanded': {
                                        backgroundColor: 'rgba(211, 47, 47, 0.08)',
                                        borderLeft: '4px solid #d32f2f',
                                      },
                                    }}
                                  >
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                      <Typography variant="subtitle1" color="error">
                                        Violations ({result.accessibilityResults.violations.length})
                                      </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                      {result.accessibilityResults.violations.map((violation, vIndex) => (
                                        <Accordion 
                                          key={vIndex}
                                          defaultExpanded={result.accessibilityResults?.violations.length === 1}
                                          sx={{
                                            '&.Mui-expanded': {
                                              backgroundColor: 'rgba(211, 47, 47, 0.04)',
                                              borderLeft: '2px solid #d32f2f',
                                            },
                                          }}
                                        >
                                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                            <Typography>
                                              {WCAG_MAPPING[violation.id] ? 
                                                `SC ${WCAG_MAPPING[violation.id].sc} ${WCAG_MAPPING[violation.id].name} - ${violation.impact} impact (${violation.nodes.length} ${violation.nodes.length === 1 ? 'instance' : 'instances'})` :
                                                `${violation.id} - ${violation.impact} impact (${violation.nodes.length} ${violation.nodes.length === 1 ? 'instance' : 'instances'})`
                                              }
                                            </Typography>
                                          </AccordionSummary>
                                          <AccordionDetails>
                                            <Typography variant="subtitle2" gutterBottom>
                                              WCAG Success Criterion:
                                            </Typography>
                                            <Typography paragraph>
                                              {WCAG_MAPPING[violation.id] ? 
                                                `SC ${WCAG_MAPPING[violation.id].sc} ${WCAG_MAPPING[violation.id].name} (Level ${WCAG_MAPPING[violation.id].level})` :
                                                violation.tags
                                                  .filter(tag => tag.startsWith('wcag2'))
                                                  .map(tag => {
                                                    const level = tag.endsWith('a') ? 'A' : tag.endsWith('aa') ? 'AA' : 'AAA';
                                                    const sc = tag.match(/\d+\.\d+\.\d+/)?.[0] || '';
                                                    return `SC ${sc} Level ${level}`;
                                                  })
                                                  .join(', ')}
                                            </Typography>
                                            <Typography variant="subtitle2" gutterBottom>
                                              Description:
                                            </Typography>
                                            <Typography paragraph>
                                              {violation.description}
                                            </Typography>
                                            <Typography variant="subtitle2" gutterBottom>
                                              Explanation:
                                            </Typography>
                                            <Typography paragraph>
                                              {violation.help}
                                            </Typography>
                                            <Typography variant="subtitle2" gutterBottom>
                                              Affected Elements:
                                            </Typography>
                                            {violation.nodes.map((node, nIndex) => (
                                              <Box key={nIndex} sx={{ mb: 2 }}>
                                                <Typography variant="body2" component="pre" sx={{ 
                                                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                                                  p: 1,
                                                  borderRadius: 1,
                                                  overflowX: 'auto',
                                                  fontFamily: 'monospace',
                                                  whiteSpace: 'pre-wrap',
                                                  wordBreak: 'break-word'
                                                }}>
                                                  {node.html}
                                                </Typography>
                                                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                                                  {node.failureSummary}
                                                </Typography>
                                              </Box>
                                            ))}
                                            <Typography variant="body2">
                                              <a 
                                                href={WCAG_MAPPING[violation.id]?.url || `https://www.w3.org/WAI/WCAG22/quickref/?versions=2.2&levels=${violation.tags.find(tag => tag.startsWith('wcag2'))?.toLowerCase() || 'aaa'}&technologies=${violation.id}`}
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                style={{
                                                  color: '#90caf9',
                                                  textDecoration: 'none'
                                                }}
                                                onMouseOver={(e) => {
                                                  e.currentTarget.style.color = '#42a5f5';
                                                  e.currentTarget.style.textDecoration = 'underline';
                                                }}
                                                onMouseOut={(e) => {
                                                  e.currentTarget.style.color = '#90caf9';
                                                  e.currentTarget.style.textDecoration = 'none';
                                                }}
                                                onFocus={(e) => {
                                                  e.currentTarget.style.color = '#42a5f5';
                                                  e.currentTarget.style.textDecoration = 'underline';
                                                }}
                                                onBlur={(e) => {
                                                  e.currentTarget.style.color = '#90caf9';
                                                  e.currentTarget.style.textDecoration = 'none';
                                                }}
                                              >
                                                View WCAG 2.2 Rule
                                              </a>
                                            </Typography>
                                          </AccordionDetails>
                                        </Accordion>
                                      ))}
                                    </AccordionDetails>
                                  </Accordion>

                                  {/* Passes Section */}
                                  <Accordion 
                                    defaultExpanded={false}
                                    sx={{
                                      '&.Mui-expanded': {
                                        backgroundColor: 'rgba(46, 125, 50, 0.08)',
                                        borderLeft: '4px solid #2e7d32',
                                      },
                                    }}
                                  >
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                      <Typography variant="subtitle1" color="success.main">
                                        Passes ({result.accessibilityResults.passes.length})
                                      </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                      <List>
                                        {result.accessibilityResults.passes.map((pass, pIndex) => (
                                          <ListItem key={pIndex}>
                                            <ListItemText
                                              primary={
                                                <Box>
                                                  <Typography>{WCAG_MAPPING[pass.id]?.name || pass.id}</Typography>
                                                  <Typography variant="body2" color="text.secondary">
                                                    {WCAG_MAPPING[pass.id] 
                                                      ? `SC ${WCAG_MAPPING[pass.id].sc} ${WCAG_MAPPING[pass.id].name} (Level ${WCAG_MAPPING[pass.id].level})`
                                                      : pass.tags
                                                          .filter(tag => tag.startsWith('wcag2'))
                                                          .map(tag => {
                                                            const level = tag.endsWith('a') ? 'A' : tag.endsWith('aa') ? 'AA' : 'AAA';
                                                            const sc = tag.match(/\d+\.\d+\.\d+/)?.[0] || '';
                                                            return `SC ${sc} Level ${level}`;
                                                          })
                                                          .join(', ')}
                                                  </Typography>
                                                </Box>
                                              }
                                              secondary={pass.description}
                                            />
                                          </ListItem>
                                        ))}
                                      </List>
                                    </AccordionDetails>
                                  </Accordion>

                                  {/* Incomplete Section */}
                                  <Accordion 
                                    defaultExpanded={false}
                                    sx={{
                                      '&.Mui-expanded': {
                                        backgroundColor: 'rgba(237, 108, 2, 0.08)',
                                        borderLeft: '4px solid #ed6c02',
                                      },
                                    }}
                                  >
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                      <Typography variant="subtitle1" color="warning.main">
                                        Incomplete Tests ({result.accessibilityResults.incomplete.length})
                                      </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                      <List>
                                        {result.accessibilityResults.incomplete.map((incomplete, iIndex) => (
                                          <ListItem key={iIndex}>
                                            <ListItemText
                                              primary={
                                                <Box>
                                                  <Typography>{WCAG_MAPPING[incomplete.id]?.name || incomplete.id}</Typography>
                                                  <Typography variant="body2" color="text.secondary">
                                                    {WCAG_MAPPING[incomplete.id]
                                                      ? `SC ${WCAG_MAPPING[incomplete.id].sc} ${WCAG_MAPPING[incomplete.id].name} (Level ${WCAG_MAPPING[incomplete.id].level})`
                                                      : incomplete.tags
                                                          .filter(tag => tag.startsWith('wcag2'))
                                                          .map(tag => {
                                                            const level = tag.endsWith('a') ? 'A' : tag.endsWith('aa') ? 'AA' : 'AAA';
                                                            const sc = tag.match(/\d+\.\d+\.\d+/)?.[0] || '';
                                                            return `SC ${sc} Level ${level}`;
                                                          })
                                                          .join(', ')}
                                                  </Typography>
                                                </Box>
                                              }
                                              secondary={incomplete.description}
                                            />
                                          </ListItem>
                                        ))}
                                      </List>
                                    </AccordionDetails>
                                  </Accordion>

                                  {/* Non-applicable Section */}
                                  <Accordion 
                                    defaultExpanded={false}
                                    sx={{
                                      '&.Mui-expanded': {
                                        backgroundColor: 'rgba(156, 39, 176, 0.08)',
                                        borderLeft: '4px solid #9c27b0',
                                      },
                                    }}
                                  >
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                      <Typography variant="subtitle1" color="secondary.main">
                                        Non-applicable Tests ({result.accessibilityResults.nonApplicable?.length || 0})
                                      </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                      <List>
                                        {result.accessibilityResults.nonApplicable?.map((nonApplicable, nIndex) => (
                                          <ListItem key={nIndex}>
                                            <ListItemText
                                              primary={
                                                <Box>
                                                  <Typography>{WCAG_MAPPING[nonApplicable.id]?.name || nonApplicable.id}</Typography>
                                                  <Typography variant="body2" color="text.secondary">
                                                    {WCAG_MAPPING[nonApplicable.id]
                                                      ? `SC ${WCAG_MAPPING[nonApplicable.id].sc} ${WCAG_MAPPING[nonApplicable.id].name} (Level ${WCAG_MAPPING[nonApplicable.id].level})`
                                                      : nonApplicable.tags
                                                          .filter(tag => tag.startsWith('wcag2'))
                                                          .map(tag => {
                                                            const level = tag.endsWith('a') ? 'A' : tag.endsWith('aa') ? 'AA' : 'AAA';
                                                            const sc = tag.match(/\d+\.\d+\.\d+/)?.[0] || '';
                                                            return `SC ${sc} Level ${level}`;
                                                          })
                                                          .join(', ')}
                                                  </Typography>
                                                </Box>
                                              }
                                              secondary={nonApplicable.description}
                                            />
                                          </ListItem>
                                        ))}
                                      </List>
                                    </AccordionDetails>
                                  </Accordion>
                                </Box>
                              )}
                              {showLinkDiscovery && result.links.length > 0 && (
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