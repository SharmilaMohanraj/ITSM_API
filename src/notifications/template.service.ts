import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface TemplateData {
  [key: string]: string | number | boolean | undefined;
}

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private templatesCache: Map<string, EmailTemplate> = new Map();
  private readonly templatesDir: string;

  constructor() {
    // Get templates directory path
    // In development: __dirname points to src/notifications
    // In production: __dirname points to dist/notifications
    // Templates should be copied to dist during build, or we use src path
    const isProduction = __dirname.includes('dist');
    if (isProduction) {
      // In production, templates should be in dist/notifications/templates
      this.templatesDir = path.join(__dirname, 'templates');
    } else {
      // In development, use src path
      this.templatesDir = path.join(process.cwd(), 'src', 'notifications', 'templates');
    }
  }

  /**
   * Load template from JSON file
   */
  private loadTemplate(templateName: string): EmailTemplate {
    // Check cache first
    if (this.templatesCache.has(templateName)) {
      return this.templatesCache.get(templateName)!;
    }

    const templatePath = path.join(this.templatesDir, `${templateName}.json`);

    try {
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      const template: EmailTemplate = JSON.parse(templateContent);
      
      // Cache the template
      this.templatesCache.set(templateName, template);
      
      return template;
    } catch (error) {
      this.logger.error(`Failed to load template ${templateName}:`, error);
      throw new Error(`Template ${templateName} not found or invalid`);
    }
  }

  /**
   * Simple template variable replacement
   * Supports {{variable}} syntax and {{#if variable}}...{{/if}} conditionals
   */
  private replaceVariables(template: string, data: TemplateData): string {
    let result = template;

    // Handle conditional blocks first {{#if variable}}...{{/if}}
    result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
      const value = data[key];
      if (value !== undefined && value !== null && value !== '' && value !== false) {
        // Recursively process the content inside the conditional
        return this.replaceVariables(content, data);
      }
      return '';
    });

    // Replace {{variable}} patterns (after conditionals are processed)
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = data[key];
      return value !== undefined && value !== null ? String(value) : '';
    });

    return result;
  }

  /**
   * Render template with data
   */
  render(templateName: string, data: TemplateData): EmailTemplate {
    const template = this.loadTemplate(templateName);

    return {
      subject: this.replaceVariables(template.subject, data),
      text: this.replaceVariables(template.text, data),
      html: this.replaceVariables(template.html, data),
    };
  }

  /**
   * Clear template cache (useful for development)
   */
  clearCache(): void {
    this.templatesCache.clear();
    this.logger.log('Template cache cleared');
  }
}
