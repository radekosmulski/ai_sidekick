// jupyterDetector.js
/**
 * Detects if the current JavaScript environment is running within a Jupyter notebook
 * @returns {Object} Object containing detection results and methods used
 */
export async function detectJupyter() {
    try {
        // Check for body class first as it's simpler
        const body = document.querySelector('body');
        if (body && body.classList.contains('notebook_app')) {
            return {
                isJupyter: true,
                methods: ['body_class']
            };
        }

        // Original detection logic
        const cells = document.querySelectorAll('.jp-Cell');
        const notebook = document.querySelector('.jp-Notebook');
        const kernelName = document.querySelector('.jp-Notebook-footer');

        const isJupyter = !!(cells.length && notebook);

        if (isJupyter) {
            return {
                isJupyter: true,
                methods: ['cells_and_notebook']
            };
        }

        return {
            isJupyter: false,
            methods: []
        };

    } catch (error) {
        console.error('Error detecting Jupyter:', error);
        return {
            isJupyter: false,
            methods: [],
            error: error.message
        };
    }
}