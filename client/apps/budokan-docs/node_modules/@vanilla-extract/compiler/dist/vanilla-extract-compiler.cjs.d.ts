import { UserConfig } from 'vite';
import { IdentifierOption } from '@vanilla-extract/integration';

interface Compiler {
    processVanillaFile(filePath: string, options?: {
        outputCss?: boolean;
    }): Promise<{
        source: string;
        watchFiles: Set<string>;
    }>;
    getCssForFile(virtualCssFilePath: string): {
        filePath: string;
        css: string;
    };
    close(): Promise<void>;
}
interface CreateCompilerOptions {
    root: string;
    cssImportSpecifier?: (filePath: string) => string;
    identifiers?: IdentifierOption;
    viteConfig?: UserConfig;
    /** @deprecated */
    viteResolve?: UserConfig['resolve'];
    /** @deprecated */
    vitePlugins?: UserConfig['plugins'];
}
declare const createCompiler: ({ root, identifiers, cssImportSpecifier, viteConfig, viteResolve, vitePlugins, }: CreateCompilerOptions) => Compiler;

export { type Compiler, type CreateCompilerOptions, createCompiler };
