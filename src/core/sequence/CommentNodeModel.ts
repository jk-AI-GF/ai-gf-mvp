// src/core/sequence/CommentNodeModel.ts

import { BaseNode } from "./BaseNode";
import { PluginContext } from "../../plugin-api/plugin-context";

export interface SerializedCommentNodeData {
    nodeType: 'CommentNodeModel';
    comment: string;
    width: number;
    height: number;
}

export class CommentNodeModel extends BaseNode {
    public comment: string;
    public width: number;
    public height: number;

    constructor(id: string, comment: string = '여기에 주석을 입력하세요...', width: number = 200, height: number = 150) {
        // 주석 노드는 입력도, 출력도 없습니다.
        super(id, 'Comment', [], []);
        this.comment = comment;
        this.width = width;
        this.height = height;
    }

    // 주석 노드는 실행 로직이 없습니다.
    async execute(
        context: PluginContext,
        inputs: Record<string, any>
    ): Promise<{ outputs: Record<string, any> }> {
        return { outputs: {} };
    }

    clone(): BaseNode {
        return new CommentNodeModel(this.id, this.comment, this.width, this.height);
    }

    serialize(): SerializedCommentNodeData {
        return {
            nodeType: 'CommentNodeModel',
            comment: this.comment,
            width: this.width,
            height: this.height,
        };
    }
}
