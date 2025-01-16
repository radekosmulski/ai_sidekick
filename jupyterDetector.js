// jupyterDetector.js
/**
 * Detects if the current JavaScript environment is running within a Jupyter notebook
 * @returns {Object} Object containing detection results and methods used
 */
export const detectJupyter = async () => {
    const checks = {
        hasNotebookAttribute: () => {
            const body = document.body;
            const hasAttribute = body && body.getAttribute('data-notebook') === 'notebooks';
            console.debug('Notebook attribute check:', hasAttribute);
            return hasAttribute;
        },
        hasJupyterContainer: () => {
            const hasContainer = document.body.classList.contains('jp-ThemedContainer');
            console.debug('Jupyter container check:', hasContainer);
            return hasContainer;
        }
    };

    const results = await Object.entries(checks)
        .reduce(async (acc, [name, check]) => {
            try {
                if (await check()) {
                    (await acc).methods.push(name);
                    (await acc).isJupyter = true;
                }
            } catch (e) {
                console.debug(`Error in ${name} check:`, e);
            }
            return acc;
        }, Promise.resolve({ isJupyter: false, methods: [] }));

    console.debug('Final detection results:', results);
    return results;
};