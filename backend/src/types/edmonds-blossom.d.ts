declare module 'edmonds-blossom' {
    /**
     * Edmonds' Blossom algorithm for maximum weighted matching on general graphs.
     *
     * @param edges - Array of [vertexA, vertexB, weight] triples. Vertices are integer indices.
     * @param maxCardinality - If true, forces maximum cardinality (most pairs possible, even if some weights are low).
     * @returns Array where result[i] = index of vertex matched to i, or -1 if unmatched.
     */
    function blossom(edges: Array<[number, number, number]>, maxCardinality?: boolean): number[];
    export = blossom;
}
