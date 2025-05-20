'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  Drawer,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Switch,
  Pagination,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';

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
        screenshot?: string;
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
  isCrawlCancelled: boolean;
  elapsed: number;
}

// Add memoized scanned page accordion
const ScannedPageAccordion = React.memo(function ScannedPageAccordion({ 
  result,
  showLinkDiscovery 
}: { 
  result: CrawlResult;
  showLinkDiscovery: boolean;
}) {
  return (
    <Accordion
      sx={{
        '&.Mui-expanded': {
          backgroundColor: 'rgba(25, 118, 210, 0.08)',
          borderLeft: '4px solid #1976d2',
        },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Typography component="h3" sx={{ wordBreak: 'break-all' }}>{result.url}</Typography>
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
                <Typography component="h4" variant="h6">Screenshot</Typography>
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
            <Typography component="h4" variant="h6" gutterBottom>Accessibility Results:</Typography>
            
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
                <Typography component="h5" variant="subtitle1" color="error">
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
                      <Typography component="h6">
                        {WCAG_MAPPING[violation.id] ? 
                          `SC ${WCAG_MAPPING[violation.id].sc} ${WCAG_MAPPING[violation.id].name} - ${violation.impact} impact (${violation.nodes.length} ${violation.nodes.length === 1 ? 'instance' : 'instances'})` :
                          `${violation.id} - ${violation.impact} impact (${violation.nodes.length} ${violation.nodes.length === 1 ? 'instance' : 'instances'})`
                        }
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{
                        maxHeight: violation.nodes.length > 3 ? '600px' : 'none',
                        overflowY: violation.nodes.length > 3 ? 'auto' : 'visible',
                        '&::-webkit-scrollbar': {
                          width: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '4px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: 'rgba(255, 255, 255, 0.2)',
                          borderRadius: '4px',
                          '&:hover': {
                            background: 'rgba(255, 255, 255, 0.3)',
                          },
                        },
                      }}>
                        <Typography component="h6" variant="subtitle2" gutterBottom>
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
                        <Typography component="h6" variant="subtitle2" gutterBottom>
                          AXE Core Check:
                        </Typography>
                        <Typography paragraph>
                          {violation.id}
                        </Typography>
                        <Typography component="h6" variant="subtitle2" gutterBottom>
                          Description:
                        </Typography>
                        <Typography paragraph>
                          {violation.description}
                        </Typography>
                        <Typography component="h6" variant="subtitle2" gutterBottom>
                          Explanation:
                        </Typography>
                        <Typography paragraph>
                          {violation.help}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>
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
                        <Typography component="h6" variant="subtitle2" gutterBottom>
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
                              wordBreak: 'break-all'
                            }}>
                              {node.html}
                            </Typography>
                            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                              {node.failureSummary}
                            </Typography>
                            {node.screenshot && (
                              <Box sx={{ mt: 2, mb: 2 }}>
                                <Typography variant="body2" gutterBottom>
                                  Screenshot of the violation:
                                </Typography>
                                <img 
                                  src={node.screenshot} 
                                  alt={`Screenshot of ${violation.id} violation`}
                                  style={{ 
                                    maxWidth: '100%', 
                                    height: 'auto',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '4px'
                                  }}
                                />
                              </Box>
                            )}
                          </Box>
                        ))}
                      </Box>
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
                <Typography component="h5" variant="subtitle1" color="success.main">
                  Passes ({result.accessibilityResults.passes.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {result.accessibilityResults.passes.map((pass, pIndex) => (
                  <Accordion 
                    key={pIndex}
                    defaultExpanded={false}
                    sx={{
                      '&.Mui-expanded': {
                        backgroundColor: 'rgba(46, 125, 50, 0.04)',
                        borderLeft: '2px solid #2e7d32',
                      },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography component="h6">
                        {WCAG_MAPPING[pass.id] ? 
                          `SC ${WCAG_MAPPING[pass.id].sc} ${WCAG_MAPPING[pass.id].name}` :
                          pass.id}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography component="h6" variant="subtitle2" gutterBottom>
                        WCAG Success Criterion:
                      </Typography>
                      <Typography paragraph>
                        {WCAG_MAPPING[pass.id] ? 
                          `SC ${WCAG_MAPPING[pass.id].sc} ${WCAG_MAPPING[pass.id].name} (Level ${WCAG_MAPPING[pass.id].level})` :
                          pass.tags
                            .filter(tag => tag.startsWith('wcag2'))
                            .map(tag => {
                              const level = tag.endsWith('a') ? 'A' : tag.endsWith('aa') ? 'AA' : 'AAA';
                              const sc = tag.match(/\d+\.\d+\.\d+/)?.[0] || '';
                              return `SC ${sc} Level ${level}`;
                            })
                            .join(', ')}
                      </Typography>
                      <Typography component="h6" variant="subtitle2" gutterBottom>
                        AXE Core Check:
                      </Typography>
                      <Typography paragraph>
                        {pass.id}
                      </Typography>
                      <Typography component="h6" variant="subtitle2" gutterBottom>
                        Description:
                      </Typography>
                      <Typography>
                        {pass.description}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
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
                <Typography component="h5" variant="subtitle1" color="warning.main">
                  Incomplete Tests ({result.accessibilityResults.incomplete.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {result.accessibilityResults.incomplete.map((incomplete, iIndex) => (
                  <Accordion 
                    key={iIndex}
                    defaultExpanded={false}
                    sx={{
                      '&.Mui-expanded': {
                        backgroundColor: 'rgba(237, 108, 2, 0.04)',
                        borderLeft: '2px solid #ed6c02',
                      },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography component="h6">
                        {WCAG_MAPPING[incomplete.id] ? 
                          `SC ${WCAG_MAPPING[incomplete.id].sc} ${WCAG_MAPPING[incomplete.id].name}` :
                          incomplete.id}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography component="h6" variant="subtitle2" gutterBottom>
                        WCAG Success Criterion:
                      </Typography>
                      <Typography paragraph>
                        {WCAG_MAPPING[incomplete.id] ? 
                          `SC ${WCAG_MAPPING[incomplete.id].sc} ${WCAG_MAPPING[incomplete.id].name} (Level ${WCAG_MAPPING[incomplete.id].level})` :
                          incomplete.tags
                            .filter(tag => tag.startsWith('wcag2'))
                            .map(tag => {
                              const level = tag.endsWith('a') ? 'A' : tag.endsWith('aa') ? 'AA' : 'AAA';
                              const sc = tag.match(/\d+\.\d+\.\d+/)?.[0] || '';
                              return `SC ${sc} Level ${level}`;
                            })
                            .join(', ')}
                      </Typography>
                      <Typography component="h6" variant="subtitle2" gutterBottom>
                        AXE Core Check:
                      </Typography>
                      <Typography paragraph>
                        {incomplete.id}
                      </Typography>
                      <Typography component="h6" variant="subtitle2" gutterBottom>
                        Description:
                      </Typography>
                      <Typography>
                        {incomplete.description}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
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
                <Typography component="h5" variant="subtitle1" color="secondary.main">
                  Non-applicable Tests ({result.accessibilityResults.nonApplicable?.length || 0})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {result.accessibilityResults.nonApplicable?.map((nonApplicable, nIndex) => (
                  <Accordion 
                    key={nIndex}
                    defaultExpanded={false}
                    sx={{
                      '&.Mui-expanded': {
                        backgroundColor: 'rgba(156, 39, 176, 0.04)',
                        borderLeft: '2px solid #9c27b0',
                      },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography component="h6">
                        {WCAG_MAPPING[nonApplicable.id] ? 
                          `SC ${WCAG_MAPPING[nonApplicable.id].sc} ${WCAG_MAPPING[nonApplicable.id].name}` :
                          nonApplicable.id}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography component="h6" variant="subtitle2" gutterBottom>
                        WCAG Success Criterion:
                      </Typography>
                      <Typography paragraph>
                        {WCAG_MAPPING[nonApplicable.id] ? 
                          `SC ${WCAG_MAPPING[nonApplicable.id].sc} ${WCAG_MAPPING[nonApplicable.id].name} (Level ${WCAG_MAPPING[nonApplicable.id].level})` :
                          nonApplicable.tags
                            .filter(tag => tag.startsWith('wcag2'))
                            .map(tag => {
                              const level = tag.endsWith('a') ? 'A' : tag.endsWith('aa') ? 'AA' : 'AAA';
                              const sc = tag.match(/\d+\.\d+\.\d+/)?.[0] || '';
                              return `SC ${sc} Level ${level}`;
                            })
                            .join(', ')}
                      </Typography>
                      <Typography component="h6" variant="subtitle2" gutterBottom>
                        AXE Core Check:
                      </Typography>
                      <Typography paragraph>
                        {nonApplicable.id}
                      </Typography>
                      <Typography component="h6" variant="subtitle2" gutterBottom>
                        Description:
                      </Typography>
                      <Typography>
                        {nonApplicable.description}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
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
  );
});

// Move TimerDisplay to be a completely separate component
const TimerDisplay = React.memo(function TimerDisplay() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCrawlCancelled, setIsCrawlCancelled] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Subscribe to crawl events
  useEffect(() => {
    const handleCrawlStart = () => {
      // Reset all timer state
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      startTimeRef.current = Date.now();
      setElapsed(0);
      setIsLoading(true);
      setIsCrawlCancelled(false);
      
      // Start new timer
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const elapsedMs = now - (startTimeRef.current || now);
        setElapsed(Math.floor(elapsedMs / 1000));
      }, 1000);
    };

    const handleCrawlComplete = () => {
      setIsLoading(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const handleCrawlCancel = () => {
      setIsLoading(false);
      setIsCrawlCancelled(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    // Subscribe to events
    window.addEventListener('crawl:start', handleCrawlStart);
    window.addEventListener('crawl:complete', handleCrawlComplete);
    window.addEventListener('crawl:cancel', handleCrawlCancel);

    return () => {
      // Cleanup
      window.removeEventListener('crawl:start', handleCrawlStart);
      window.removeEventListener('crawl:complete', handleCrawlComplete);
      window.removeEventListener('crawl:cancel', handleCrawlCancel);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Only hide the timer if we haven't started yet
  if (!startTimeRef.current && elapsed === 0) return null;

  // Format seconds as HH:MM:SS
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

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

export default function Home() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scanResultMap, setScanResultMap] = useState<Map<string, CrawlResult>>(new Map());
  const [scanResultArray, setScanResultArray] = useState<CrawlResult[]>([]);
  const [takeScreenshots, setTakeScreenshots] = useState(false);
  const [crawlEntireWebsite, setCrawlEntireWebsite] = useState(false);
  const [checkAccessibility, setCheckAccessibility] = useState(false);
  const [wcagLevel, setWcagLevel] = useState<'A' | 'AA' | 'AAA' | 'X'>('X');
  const [concurrentPages, setConcurrentPages] = useState<number>(1);
  const [showCompletion, setShowCompletion] = useState(false);
  const [isCrawlComplete, setIsCrawlComplete] = useState(false);
  const [isCrawlCancelled, setIsCrawlCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [increaseTimeout, setIncreaseTimeout] = useState(false);
  const [slowRateLimit, setSlowRateLimit] = useState(false);
  const [usedSitemap, setUsedSitemap] = useState<boolean | null>(null);
  const [tookScreenshots, setTookScreenshots] = useState(false);
  const [checkedAccessibility, setCheckedAccessibility] = useState(false);
  const [showLinkDiscovery, setShowLinkDiscovery] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const resultsPerPage = 10;
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const handleScreenshotsChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setTakeScreenshots(event.target.checked);
  }, []);

  const handleFullCrawlChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setCrawlEntireWebsite(event.target.checked);
  }, []);

  const handleWcagLevelChange = useCallback((event: React.MouseEvent<HTMLElement>, newLevel: 'X' | 'A' | 'AA' | 'AAA' | null) => {
    if (newLevel !== null) {
      setWcagLevel(newLevel);
    }
  }, []);

  const handleShowLinkDiscoveryChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setShowLinkDiscovery(event.target.checked);
  }, []);

  const handleIncreaseTimeoutChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setIncreaseTimeout(event.target.checked);
  }, []);

  const handleSlowRateLimitChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSlowRateLimit(event.target.checked);
  }, []);

  const handleConcurrentPagesChange = useCallback((event: React.MouseEvent<HTMLElement>, newValue: number | null) => {
    if (newValue !== null) {
      setConcurrentPages(newValue);
    }
  }, []);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
  };

  // Calculate pagination values
  const indexOfLastResult = currentPage * resultsPerPage;
  const indexOfFirstResult = indexOfLastResult - resultsPerPage;
  const currentResults = scanResultArray.slice(indexOfFirstResult, indexOfLastResult);
  const totalPages = Math.ceil(scanResultArray.length / resultsPerPage);

  const OptionsRow = useMemo(() => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 4, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body1" sx={{ whiteSpace: 'nowrap' }}>
          Screenshots:
        </Typography>
        <Switch
          checked={takeScreenshots}
          onChange={handleScreenshotsChange}
          aria-label="Take screenshots"
          size="small"
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body1" sx={{ whiteSpace: 'nowrap' }}>
          Full Crawl:
        </Typography>
        <Switch
          checked={crawlEntireWebsite}
          onChange={handleFullCrawlChange}
          aria-label="Crawl entire website"
          size="small"
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body1" sx={{ whiteSpace: 'nowrap' }}>
          WCAG Check:
        </Typography>
        <ToggleButtonGroup
          value={wcagLevel}
          exclusive
          onChange={handleWcagLevelChange}
          aria-label="WCAG Accessibility check level"
          size="small"
        >
          <ToggleButton value="X" aria-label="No accessibility check">
            <CloseIcon />
          </ToggleButton>
          <ToggleButton value="A" aria-label="Single-A">
            A
          </ToggleButton>
          <ToggleButton value="AA" aria-label="Double-A">
            AA
          </ToggleButton>
          <ToggleButton value="AAA" aria-label="Triple-A">
            AAA
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Box>
  ), [takeScreenshots, crawlEntireWebsite, wcagLevel, handleScreenshotsChange, handleFullCrawlChange, handleWcagLevelChange]);

  const AdvancedSettings = useMemo(() => (
    <Box sx={{ width: 300, p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Advanced Settings
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Concurrent Pages:
        </Typography>
        <ToggleButtonGroup
          value={concurrentPages}
          exclusive
          onChange={handleConcurrentPagesChange}
          aria-label="Number of concurrent pages to crawl"
          size="small"
          fullWidth
        >
          {[1, 2, 3, 4, 5].map((num) => (
            <ToggleButton key={num} value={num} aria-label={`${num} concurrent pages`}>
              {num}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <FormControlLabel
        control={
          <Checkbox
            checked={showLinkDiscovery}
            onChange={handleShowLinkDiscoveryChange}
          />
        }
        label="Show link discovery information"
        sx={{ mb: 1 }}
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={increaseTimeout}
            onChange={handleIncreaseTimeoutChange}
          />
        }
        label="Increase timeout for slow sites"
        sx={{ mb: 1 }}
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={slowRateLimit}
            onChange={handleSlowRateLimitChange}
          />
        }
        label="Slow down rate limiting"
        sx={{ mb: 1 }}
      />
    </Box>
  ), [showLinkDiscovery, increaseTimeout, slowRateLimit, concurrentPages, handleShowLinkDiscoveryChange, handleIncreaseTimeoutChange, handleSlowRateLimitChange, handleConcurrentPagesChange]);

  const getUniqueLinks = (links: string[]): string[] => {
    return Array.from(new Set(links));
  };

  const handleCancel = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setIsCleaningUp(true);
    setIsCrawlComplete(true);
    setIsCrawlCancelled(true);
    window.dispatchEvent(new Event('crawl:cancel'));
  };

  const handleCrawl = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    // Prevent starting a new crawl if we're still cleaning up
    if (isLoading || isCleaningUp) {
      setError('Please wait for the previous scan to finish cleaning up before starting a new one.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setScanResultMap(new Map());
    setScanResultArray([]);
    setCurrentPage(1);
    setUsedSitemap(null);
    setTookScreenshots(takeScreenshots);
    setCheckedAccessibility(wcagLevel !== 'X');
    abortControllerRef.current = new AbortController();

    // Dispatch crawl start event
    window.dispatchEvent(new Event('crawl:start'));

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
          checkAccessibility: wcagLevel !== 'X',
          wcagLevels: {
            A: wcagLevel === 'A' || wcagLevel === 'AA' || wcagLevel === 'AAA',
            AA: wcagLevel === 'AA' || wcagLevel === 'AAA',
            AAA: wcagLevel === 'AAA'
          },
          increaseTimeout,
          slowRateLimit,
          concurrentPages
        }),
        signal: abortControllerRef.current.signal
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
          if (done) {
            setIsCleaningUp(false);
            break;
          }
          
          buffer += new TextDecoder().decode(value);
          
          // Process complete JSON objects from the buffer
          let startIndex = 0;
          let endIndex;
          
          while ((endIndex = buffer.indexOf('\n', startIndex)) !== -1) {
            const jsonStr = buffer.slice(startIndex, endIndex);
            try {
              const data = JSON.parse(jsonStr);
              if (data.error) {
                if (data.error.includes('Browser pool is currently being cleaned up')) {
                  setIsCleaningUp(true);
                  setError('Please wait for the previous scan to finish cleaning up before starting a new one.');
                  setIsLoading(false);
                  return;
                }
                throw new Error(data.error);
              }
              if (data.newResults) {
                // Merge new results into the map
                setScanResultMap(prevMap => {
                  const newMap = new Map(prevMap);
                  data.newResults.forEach((result: CrawlResult) => {
                    newMap.set(result.url, result);
                  });
                  // Update the array for rendering without resetting the page
                  setScanResultArray(Array.from(newMap.values()));
                  return newMap;
                });
                setUsedSitemap(data.usedSitemap);
                setTookScreenshots(takeScreenshots);
                setCheckedAccessibility(data.checkedAccessibility);
              } else if (data.results) {
                // Final results: replace the map and array
                const newMap = new Map<string, CrawlResult>();
                data.results.forEach((result: CrawlResult) => {
                  newMap.set(result.url, result);
                });
                setScanResultMap(newMap);
                setScanResultArray(Array.from(newMap.values()));
                setUsedSitemap(data.usedSitemap);
                setTookScreenshots(takeScreenshots);
                setCheckedAccessibility(data.checkedAccessibility);
                setShowCompletion(true);
                setIsCrawlComplete(true);
                setIsLoading(false);
                setIsCleaningUp(false);
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
          window.dispatchEvent(new Event('crawl:cancel'));
          // Reset cleanup state when connection is aborted
          setIsCleaningUp(false);
        } else {
          console.error('Error crawling website:', error);
          setError(error instanceof Error ? error.message : 'An unknown error occurred');
          setIsCleaningUp(false);
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Crawl cancelled by user');
        window.dispatchEvent(new Event('crawl:cancel'));
        // Reset cleanup state when connection is aborted
        setIsCleaningUp(false);
      } else {
        console.error('Error crawling website:', error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
        setIsCleaningUp(false);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      if (!isCrawlCancelled) {
        window.dispatchEvent(new Event('crawl:complete'));
      }
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1">
              Web Crawler
            </Typography>
            <IconButton onClick={() => setIsDrawerOpen(true)}>
              <SettingsIcon />
            </IconButton>
          </Box>

          <Box component="form" sx={{ mb: 4 }}>
            <TextField
              fullWidth
              label="Website URL"
              variant="outlined"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              sx={{ mb: 2 }}
            />

            {OptionsRow}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleCrawl}
                disabled={isLoading || isCleaningUp}
                sx={{ flex: 1 }}
              >
                {isLoading ? 'Crawling...' : isCleaningUp ? 'Cleaning up...' : 'Start Crawl'}
              </Button>
              {isLoading && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleCancel}
                  disabled={isCleaningUp}
                  sx={{ flex: 1 }}
                >
                  Cancel Scan
                </Button>
              )}
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>

          <TimerDisplay />

          {scanResultArray.length > 0 && (
            <Box sx={{ mt: 2 }}>
              {usedSitemap !== null && scanResultArray.length > 1 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Pages were discovered using {usedSitemap ? 'sitemap.xml' : 'recursive link discovery'}
                </Alert>
              )}
              {tookScreenshots ? (
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Typography component="h2">Scanned Pages ({scanResultArray.length})</Typography>
                      {isLoading && (
                        <CircularProgress size={20} sx={{ ml: 2 }} />
                      )}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {currentResults.map((result) => (
                      <ScannedPageAccordion 
                        key={result.url} 
                        result={result} 
                        showLinkDiscovery={showLinkDiscovery}
                      />
                    ))}
                    {totalPages > 1 && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Pagination 
                          count={totalPages} 
                          page={currentPage} 
                          onChange={handlePageChange}
                          color="primary"
                          size="large"
                        />
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
              ) : (
                <>
                  <List>
                    {currentResults.map((result, index) => (
                      <React.Fragment key={result.url}>
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
                        {index < currentResults.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                  {totalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                      <Pagination 
                        count={totalPages} 
                        page={currentPage} 
                        onChange={handlePageChange}
                        color="primary"
                        size="large"
                      />
                    </Box>
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

        <Drawer
          anchor="right"
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        >
          {AdvancedSettings}
        </Drawer>
      </Container>
    </ThemeProvider>
  );
} 