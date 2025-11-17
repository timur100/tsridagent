import React from 'react';
import { Monitor, HardDrive, Wifi, Timer, Lock, Upload, Shield } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion';

/**
 * Accordion wrapper for settings sections
 * Provides collapsible categories for better organization
 */
const SettingsAccordion = ({ children, defaultOpen = [] }) => {
  // Group children by category
  // This component wraps existing Card components in Accordions
  
  return (
    <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-4">
      {React.Children.map(children, (child, index) => {
        if (!child) return null;
        
        // Get category info from child props
        const category = child.props?.['data-category'] || `section-${index}`;
        const title = child.props?.['data-title'] || 'Einstellungen';
        const Icon = child.props?.['data-icon'] || Monitor;
        
        return (
          <AccordionItem value={category} className="border border-border rounded-lg bg-card">
            <AccordionTrigger className="px-6 hover:no-underline">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold">{title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              {child}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};

export default SettingsAccordion;
