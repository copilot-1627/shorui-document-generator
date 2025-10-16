const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class PythonExecutor {
    constructor(documentsDir) {
        this.documentsDir = documentsDir;
        this.ensureDirectory();
    }
    
    ensureDirectory() {
        if (!fs.existsSync(this.documentsDir)) {
            fs.mkdirSync(this.documentsDir, { recursive: true });
        }
    }
    
    async executePythonCode(pythonCode, expectedFilename) {
        return new Promise((resolve, reject) => {
            const timestamp = Date.now();
            const tempPyFile = path.join(this.documentsDir, `temp_${timestamp}.py`);
            const expectedFilePath = path.join(this.documentsDir, expectedFilename);
            
            try {
                // Clean and prepare Python code
                const cleanCode = this.preparePythonCode(pythonCode, expectedFilePath);
                
                // Write Python code to temporary file
                fs.writeFileSync(tempPyFile, cleanCode, 'utf8');
                
                console.log('Executing Python code for document generation...');
                
                // Execute Python code
                const pythonProcess = exec(
                    `python "${tempPyFile}"`, 
                    { 
                        cwd: this.documentsDir,
                        timeout: 30000, // 30 second timeout
                        maxBuffer: 1024 * 1024 // 1MB buffer
                    }, 
                    (error, stdout, stderr) => {
                        // Clean up temporary file
                        this.cleanup(tempPyFile);
                        
                        if (error) {
                            console.error('Python execution error:', error.message);
                            console.error('stderr:', stderr);
                            
                            if (error.code === 'ENOENT') {
                                reject(new Error('Python is not installed or not in PATH. Please install Python 3.x and python-docx library.'));
                            } else if (error.killed) {
                                reject(new Error('Document generation timed out. Please try a simpler document.'));
                            } else {
                                reject(new Error(`Document generation failed: ${stderr || error.message}`));
                            }
                            return;
                        }
                        
                        console.log('Python execution output:', stdout);
                        
                        // Verify file was created
                        if (fs.existsSync(expectedFilePath)) {
                            const stats = fs.statSync(expectedFilePath);
                            console.log(`Document generated successfully: ${expectedFilePath} (${stats.size} bytes)`);
                            resolve({
                                filepath: expectedFilePath,
                                filename: expectedFilename,
                                size: stats.size,
                                created: new Date()
                            });
                        } else {
                            reject(new Error('Document file was not created. Check Python code and dependencies.'));
                        }
                    }
                );
                
                // Handle process errors
                pythonProcess.on('error', (error) => {
                    this.cleanup(tempPyFile);
                    reject(new Error(`Failed to start Python process: ${error.message}`));
                });
                
            } catch (error) {
                this.cleanup(tempPyFile);
                reject(new Error(`Failed to prepare Python code: ${error.message}`));
            }
        });
    }
    
    preparePythonCode(pythonCode, outputPath) {
        // Ensure required imports are present
        let cleanCode = pythonCode.trim();
        
        // Add imports if not present
        const requiredImports = [
            'from docx import Document',
            'from docx.shared import Inches',
            'from datetime import datetime'
        ];
        
        requiredImports.forEach(importStatement => {
            if (!cleanCode.includes(importStatement)) {
                cleanCode = importStatement + '\n' + cleanCode;
            }
        });
        
        // Replace any hardcoded save paths with our output path
        cleanCode = cleanCode.replace(
            /doc\.save\s*\(['"](.*?)['"]\)/g,
            `doc.save('${outputPath.replace(/\\/g, '\\\\')}')`
        );
        
        // Add error handling
        const wrappedCode = `
try:
${cleanCode.split('\n').map(line => '    ' + line).join('\n')}
except Exception as e:
    print(f"Error generating document: {e}")
    raise
`;
        
        return wrappedCode;
    }
    
    cleanup(tempFile) {
        try {
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
                console.log('Cleaned up temporary Python file');
            }
        } catch (error) {
            console.warn('Failed to cleanup temporary file:', error.message);
        }
    }
    
    // Check if Python and required libraries are available
    async checkPythonEnvironment() {
        return new Promise((resolve) => {
            exec('python --version && python -c "import docx; print(\'python-docx available\')"', 
                (error, stdout, stderr) => {
                    if (error) {
                        console.warn('Python environment check failed:', error.message);
                        resolve(false);
                    } else {
                        console.log('Python environment check:', stdout);
                        resolve(true);
                    }
                }
            );
        });
    }
}

module.exports = PythonExecutor;